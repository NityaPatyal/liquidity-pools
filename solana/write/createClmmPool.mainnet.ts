import {
  Raydium,
  TxVersion,
  TickUtils,
  CLMM_PROGRAM_ID,
  getPdaPoolId
} from "@raydium-io/raydium-sdk-v2";
import BN from "bn.js";

import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import Decimal from "decimal.js";

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
      connection: new Connection(clusterApiUrl("mainnet-beta")),
      cluster: "mainnet",
      disableFeatureCheck: true,         // Skip feature checking
      disableLoadToken: false,           // Let Raydium fetch token metadata
      blockhashCommitment: "finalized",  // Use finalized commitment
    });

    // 🪙 Fetch token metadata from chain or Raydium registry
    let token1 = await raydium.token.getTokenInfo(mint1);
    console.log("🚀 ~ :88 ~ token1:", token1)

    let token2 = await raydium.token.getTokenInfo(mint2);
    console.log("🚀 ~ :91 ~ token2:", token2)

    // Ensure tokens are in correct order
    console.log("🚀 ~ :43 ~ order check:");

    if (token1.address > token2.address) {
      console.log("🚀 ~ :46 ~ needed order swap: token1: ", token1, " token2: ", token2);
      [token1, token2] = [token2, token1]; // Swap if out of order
      console.log("🚀 ~ :48 ~ order swaped: token1: ", token1, " token2: ", token2);
    }

    const clmmConfigs = await raydium.api.getClmmConfigs()

    console.log("🚀 ~ :79 ~ clmmConfigs:", clmmConfigs)

    // 🧩 Build the config object for pool creation
    const config = { ...clmmConfigs[0], id: new PublicKey(clmmConfigs[0].id), fundOwner: '', description: '' };
    console.log("🚀 ~ :71 ~ config:", config)

    const { publicKey: expectedPoolId } = getPdaPoolId(
      CLMM_PROGRAM_ID,
      config.id,
      new PublicKey(token1.address),
      new PublicKey(token2.address)
    );

    console.log("🧠 Expected pool PDA:", expectedPoolId.toBase58());
    let poolResultFromRPC;

    try {

      poolResultFromRPC = await raydium.clmm.getPoolInfoFromRpc(expectedPoolId.toBase58());

      console.log("⚠️ Pool already exists. Proceeding to add liquidity...");
    } catch (error) {
      console.log("🆕 Pool not found. Proceeding to create...");

      let createPoolResult = await raydium.clmm.createPool({
        programId: CLMM_PROGRAM_ID,
        mint1: token1,
        mint2: token2,
        ammConfig: config,
        initialPrice: new Decimal(1),
        txVersion,
      });

      console.log("🚀 ~ :88 ~ createPoolResult:", createPoolResult);

      const poolId = createPoolResult.extInfo.mockPoolInfo.id;

      console.log("🆔 Pool ID:", poolId);

      // 📤 Send and confirm the pool creation transaction
      const { txId: createTxId } = await createPoolResult.execute({ sendAndConfirm: true });

      console.log(`✅ Pool Created: https://explorer.solana.com/tx/${createTxId}?cluster=mainnet`);

      // 🔍 Fetch full pool info and pool keys from the blockchain
      poolResultFromRPC = await raydium.clmm.getPoolInfoFromRpc(poolId);

    }

    const { poolInfo, poolKeys } = poolResultFromRPC;

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
      baseAmount: new BN(0),                  // No liquidity deposited
      otherAmountMax: new BN(0),              // No liquidity deposited
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

    console.log(`✅ Position Created (No Liquidity): https://explorer.solana.com/tx/${positionTxId}?cluster=mainnet`);
    console.log(`🎉 NFT Mint: ${extInfo.nftMint.toBase58()}`); // NFT that represents this position

  } catch (err: any) {
    // ❌ Handle any errors that occur during the process
    console.error("❌ Error:", err.message || err);
  }
}
