import {
  Raydium,
  TxVersion,
  DEVNET_PROGRAM_ID,
  TickUtils,
} from "@raydium-io/raydium-sdk-v2";
// import { fetchAmmConfig } from '@raydium-io/raydium-sdk-v2';

import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import Decimal from "decimal.js";
import dotenv from "dotenv";
dotenv.config();

console.log(`🚀 ~ :15 ~ clusterApiUrl("devnet"):`, clusterApiUrl("devnet"))

// ----------------------
// ⚙️ Configuration for CLMM Pool Creation (Raydium recommended values)
// ----------------------
const devConfigs = [
  {
    id: 'GjLEiquek1Nc2YjcBhufUGFRkaqW1JhaGjsdFd8mys38',
    index: 3,
    protocolFeeRate: 120000,
    tradeFeeRate: 10000,
    tickSpacing: 120,
    fundFeeRate: 40000,
    description: 'Best for exotic pairs',
    defaultRange: 0.1,
    defaultRangePoint: [0.01, 0.05, 0.1, 0.2, 0.5],
  },
];

export async function createClmmPool({
  privateKeyBase58,
  mint1,
  mint2,
  startPrice = "0.0001",
  endPrice = "100000",
}: {
  privateKeyBase58: string;
  mint1: string;
  mint2: string;
  startPrice?: string;
  endPrice?: string;
}) {

  // Define the transaction format (legacy or V0); we use V0
  const txVersion = TxVersion.V0;

  try {

    // fromSecretKey expects 64 bytes, i.e. [privateKey || publicKey]
    // 🔐 Load owner wallet from Base58 private key
    const secretKey = bs58.decode(privateKeyBase58); // 64 bytes

    const owner = Keypair.fromSecretKey(secretKey);
    console.log("🚀 ~ :74 ~ owner:", owner)

    // Initialize Raydium SDK with wallet + connection
    const raydium = await Raydium.load({
      owner,
      connection: new Connection(clusterApiUrl("devnet")),
      cluster: "devnet",
      disableFeatureCheck: true,         // Skip feature checking
      disableLoadToken: false,           // Let Raydium fetch token metadata
      blockhashCommitment: "finalized",  // Use finalized commitment
    });

    // 🪙 Fetch token metadata from chain or Raydium registry
    const token1 = await raydium.token.getTokenInfo(mint1);
    console.log("🚀 ~ :88 ~ token1:", token1)

    const token2 = await raydium.token.getTokenInfo(mint2);
    console.log("🚀 ~ :91 ~ token2:", token2)

    const clmmConfigs = devConfigs;
    console.log("🚀 ~ :79 ~ clmmConfigs:", clmmConfigs)

    // const clmmConfigs = await raydium.api.getClmmConfigs();

    // 🧩 Build the config object for pool creation
    const config = {
      ...clmmConfigs[0],
      id: new PublicKey("CQYbhr6amxUER4p5SC44C63R4qw4NFc9Z4Db9vF4tZwG"), // Convert config ID to PublicKey
      fundOwner: "",                       // Optional: no fund owner set
      description: "",
    };
    console.log("🚀 ~ :101 ~ config:", config)
    console.log("DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID: ",DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID);

    // const configs = await fetchAmmConfig(Connection, DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID);
    // console.log(configs.map(c => c.id.toBase58()));

    console.log("⏳ Creating Pool...");

    // 🔨 Create CLMM pool with the selected tokens and config
    let createPoolResult
    try {
      createPoolResult = await raydium.clmm.createPool({
        programId: DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID,
        mint1: token1,
        mint2: token2,
        ammConfig: config,
        initialPrice: new Decimal(1),
        txVersion,
      });

      console.log("🚀 createPoolResult:", createPoolResult);
    } catch (err: any) {
      console.error("❌ createPool error:", err?.message || err);
      throw err; // Let it bubble for full stack trace
    }

    console.log("🚀 ~ :88 ~ createPoolResult:", createPoolResult);

    const poolId = createPoolResult.extInfo.mockPoolInfo.id;

    console.log("🆔 Pool ID:", poolId);

    // 📤 Send and confirm the pool creation transaction
    const { txId: createTxId } = await createPoolResult.execute({ sendAndConfirm: true });

    console.log(`✅ Pool Created: https://explorer.solana.com/tx/${createTxId}?cluster=devnet`);

    // 🔍 Fetch full pool info and pool keys from the blockchain
    const { poolInfo, poolKeys } = await raydium.clmm.getPoolInfoFromRpc(poolId);

    // 🧮 Calculate the tick range based on user-defined start and end price
    const { tick: lowerTick } = TickUtils.getPriceAndTick({
      poolInfo,
      price: new Decimal(startPrice),
      baseIn: true,
    });

    const { tick: upperTick } = TickUtils.getPriceAndTick({
      poolInfo,
      price: new Decimal(endPrice),
      baseIn: true,
    });

    console.log("⏳ Opening Position (no liquidity)...");

    // 🎯 Create an empty position (0 liquidity) within the defined tick range
    const { execute: positionExecute, extInfo } = await raydium.clmm.openPositionFromBase({
      poolInfo,
      poolKeys,
      tickLower: Math.min(lowerTick, upperTick),  // Ensure tickLower < tickUpper
      tickUpper: Math.max(lowerTick, upperTick),
      base: "MintA",                               // Which mint is considered "base"
      baseAmount: new Decimal(0),                  // No liquidity deposited
      otherAmountMax: new Decimal(0),              // No liquidity deposited
      ownerInfo: {
        useSOLBalance: true,                       // Use SOL for fees if needed
      },
      txVersion,
      computeBudgetConfig: {
        units: 600000,         // Extra compute units
        microLamports: 100000, // Extra fee to prioritize tx
      },
    });

    // 🚀 Send and confirm the position creation transaction
    const { txId: positionTxId } = await positionExecute({ sendAndConfirm: true });

    console.log(`✅ Position Created (No Liquidity): https://explorer.solana.com/tx/${positionTxId}?cluster=devnet`);
    console.log(`🎉 NFT Mint: ${extInfo.nftMint.toBase58()}`); // NFT that represents this position

  } catch (err: any) {
    // ❌ Handle any errors that occur during the process
    console.error("❌ Error:", err.message || err);
  }
}
