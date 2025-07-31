import {
  Raydium,
  DEVNET_PROGRAM_ID,
  TxVersion,
  TickUtils,
} from "@raydium-io/raydium-sdk-v2";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import bs58 from "bs58";
import Decimal from "decimal.js";
import BN from "bn.js";

// === USER CONFIG ===
const PRIVATE_KEY_BASE58 =
  "2qyiizKCz5i61GPoy6afhjdvJwQMM9v2Xoy5nZ9Vy3wCcQCShi523hhE8q1Bma32nE5ctv81G48gh2jrkXGiV4AR";
const MINT_A = "5zT9qL6L1BnCJ9ptWXE7HmCoG93Q5qdZZvDuJMMAiBjs";
const MINT_B = "GJ6EnoBbDsAoyGkxEv1dxh7fi5vq3cUyTfhnA5YJ9NyW";
const INIT_PRICE = "0.5"; // Initial price of MintA in terms of MintB

const devConfigs = [
  {
    id: "F8aaMZVpXaQHk3Qo9BPDhsa7RgpfrfiRsk8L3iXnq3AT",
    index: 0,
    protocolFeeRate: 120000,
    tradeFeeRate: 100,
    tickSpacing: 10,
    fundFeeRate: 40000,
    description: "",
    defaultRange: 0.005,
    defaultRangePoint: [0.001, 0.003, 0.005, 0.008, 0.01],
  },
];

// === HELPER TO CREATE ATAs IF NEEDED ===
async function ensureATA(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  payer: PublicKey,
  instructions: any[]
) {
  const ata = await getAssociatedTokenAddress(mint, owner);
  try {
    await getAccount(connection, ata);
  } catch {
    instructions.push(
      createAssociatedTokenAccountInstruction(payer, ata, owner, mint)
    );
  }
  return ata;
}

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const owner = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY_BASE58));

  let [mint1, mint2] = [MINT_A, MINT_B];
  if (mint1 > mint2) [mint1, mint2] = [mint2, mint1]; // Always order for pool

  const raydium = await Raydium.load({
    connection,
    owner,
    cluster: "devnet",
    disableLoadToken: false,
    disableFeatureCheck: true,
  });

  const token1 = await raydium.token.getTokenInfo(mint1);
  const token2 = await raydium.token.getTokenInfo(mint2);

  const ataInstructions: any[] = [];
  await ensureATA(
    connection,
    new PublicKey(token1.address),
    owner.publicKey,
    owner.publicKey,
    ataInstructions
  );
  await ensureATA(
    connection,
    new PublicKey(token2.address),
    owner.publicKey,
    owner.publicKey,
    ataInstructions
  );

  if (ataInstructions.length > 0) {
    const tx = new Transaction().add(...ataInstructions);
    const txid = await connection.sendTransaction(tx, [owner]);
    await connection.confirmTransaction(txid);
    console.log("✅ ATAs Created:", txid);
  }

  const config = {
    ...devConfigs[0],
    id: new PublicKey(devConfigs[0].id),
    fundOwner: owner.publicKey.toBase58(),
    description: "",
  };

  const poolResult = await raydium.clmm.createPool({
    programId: DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID,
    mint1: token1,
    mint2: token2,
    ammConfig: config,
    initialPrice: new Decimal(INIT_PRICE),
    txVersion: TxVersion.V0,
  });

  const poolId = poolResult.extInfo.mockPoolInfo.id;
  let poolInfo, poolKeys;

  try {
    const pool = await raydium.clmm.getPoolInfoFromRpc(poolId);
    poolInfo = pool.poolInfo;
    poolKeys = pool.poolKeys;
    console.log("✅ Pool exists:", poolId);
  } catch {
    const { txId: poolTxId } = await poolResult.execute({
      sendAndConfirm: true,
    });
    console.log(
      `✅ Pool Created: https://explorer.solana.com/tx/${poolTxId}?cluster=devnet`
    );

    const pool = await raydium.clmm.getPoolInfoFromRpc(poolId);
    poolInfo = pool.poolInfo;
    poolKeys = pool.poolKeys;
  }

  // === TICK RANGE ===
  const { tick: lowerTick } = TickUtils.getPriceAndTick({
    poolInfo,
    price: new Decimal("0.5"),
    baseIn: true,
  });

  const { tick: upperTick } = TickUtils.getPriceAndTick({
    poolInfo,
    price: new Decimal("100"),
    baseIn: true,
  });

  // === OPEN POSITION (ADD LIQUIDITY) ===
  try {
    const { execute, extInfo } = await raydium.clmm.openPositionFromBase({
      poolInfo,
      poolKeys,
      tickLower: lowerTick,
      tickUpper: upperTick,
      base: "MintA",
      baseAmount: new BN(2_000_000), // Set amount here if needed
      otherAmountMax: new BN(5_000_000), // Slippage buffer
      ownerInfo: {
        useSOLBalance: true,
      },
      txVersion: TxVersion.V0,
      computeBudgetConfig: {
        units: 600_000,
        microLamports: 100_000,
      },
    });

    const { txId } = await execute({ sendAndConfirm: true });
    console.log(`✅ Position NFT: ${extInfo.nftMint.toBase58()}`);
    console.log(
      `✅ Position Created: https://solscan/tx/${txId}?cluster=devnet`
    );
  } catch (err) {
    console.error("❌ Failed to open position:", err);
  }
}

main().catch((err) => {
  console.error("❌ Top-level error:", err);
});
