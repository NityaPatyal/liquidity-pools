import { RAYMint, USDCMint, OPEN_BOOK_PROGRAM, DEVNET_PROGRAM_ID, WSOLMint, TxVersion, Raydium } from '@raydium-io/raydium-sdk-v2'
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import dotenv from "dotenv";
dotenv.config();

import * as bip39 from "bip39";
export const txVersion = TxVersion.LEGACY

const MNEMONIC = process.env.MNEMONIC as string;

// Load your wallet (private key)
const keypair = getSolanaKeypairFromMnemonic(MNEMONIC as string);
const payer = Keypair.fromSecretKey(keypair.secretKey);

export function getSolanaKeypairFromMnemonic(mnemonic: string, derivationPath = "m/44'/501'/0'/5'") {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derivedSeed = derivePath(derivationPath, seed.toString("hex")).key;
  const keypair = Keypair.fromSeed(derivedSeed);

  return keypair;
}

const RPC = process.env.SOL_TESTNET_RPC_URL as string;
const connection = new Connection(RPC, "confirmed");

// Replace with your token + USDC
const BASE_MINT = new PublicKey("2KxZurGYneZ4FxhmdGn3q8wA2KaoJBvnsvhJTm37iE58"); // Baby Pebbles Token
const QUOTE_MINT = new PublicKey("4NAcTFVvvQkVrqN2TpMjzE2452m7Lmt3u1HYERvk7huq"); // Baby Coin BYC
// export const addLookupTableInfo = LOOKUP_TABLE_CACHE // only mainnet. other = undefined


export const createMarket = async () => {
  const raydium = await Raydium.load({
    owner: keypair,
    connection,
    cluster: "devnet",
    disableFeatureCheck: true,         // Skip feature checking
    disableLoadToken: false,           // Let Raydium fetch token metadata
    blockhashCommitment: "finalized",  // Use finalized commitment
  });


  // check mint info here: https://api-v3.raydium.io/mint/list
  // or get mint info by api: await raydium.token.getTokenInfo('mint address')
  const { execute, extInfo, transactions } = await raydium.marketV2.create({
    baseInfo: {
      // create market doesn't support token 2022
      mint: BASE_MINT,
      decimals: 9,
    },
    quoteInfo: {
      // create market doesn't support token 2022
      mint: QUOTE_MINT,
      decimals: 9,
    },
    lotSize: 1,
    tickSize: 0.01,
    // dexProgramId: OPEN_BOOK_PROGRAM,
    dexProgramId: DEVNET_PROGRAM_ID.OPEN_BOOK_PROGRAM, // devnet

    requestQueueSpace: 5120 + 12, // optional
    eventQueueSpace: 262144 + 12, // optional
    orderbookQueueSpace: 65536 + 12, // optional

    txVersion,
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 46591500,
    // },
  })

  console.log(
    `create market total ${transactions.length} txs, market info: `,
    Object.keys(extInfo.address).reduce(
      (acc, cur) => ({
        ...acc,
        [cur]: extInfo.address[cur as keyof typeof extInfo.address].toBase58(),
      }),
      {}
    )
  )
  const eventQueueSpace = 262144 + 12;
  const COMMISSION_WALLET_ADDRESS_SOL = "C7JAEABJkPDPdqw7b5hVuBpuqJ8WBf9uPabTfqLEgVib";

  const getMinimumSol = (eventQueueSpace: number) => {
    if (eventQueueSpace <= 128 * 88 + 12) return 0.4;      // ~11 KB
    if (eventQueueSpace <= 1400 * 88 + 12) return 1.5;      // ~123 KB
    if (eventQueueSpace <= 2978 * 88 + 12) return 2.8;      // ~262 KB
    console.log(`Unsupported event queue space: ${eventQueueSpace} returning default to 2.8 SOL needed.`);
    return 2.8;
  };


  const senderBalance = await connection.getBalance(keypair.publicKey);
  const minimumSol = getMinimumSol(eventQueueSpace) + 1;
  const lamportsToSend = Math.floor(minimumSol * LAMPORTS_PER_SOL);
  const commissionWalletPubkey = new PublicKey(
    COMMISSION_WALLET_ADDRESS_SOL,
  );

  if (senderBalance < lamportsToSend) {
    console.warn("Insufficient funds");
    return {
      status: 0,
      txIds: [],
      error: "Insufficient funds to create market Id.",
    };
  }

  const commissionTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: commissionWalletPubkey,
      lamports: 1 * LAMPORTS_PER_SOL,
    }),
  );

  commissionTx.feePayer = keypair.publicKey;
  const sig = await connection.sendTransaction(commissionTx, [keypair]);
  console.log("🚀 ~ :122 ~ createMarket ~ sig:", sig)

  await connection.confirmTransaction(sig, "confirmed");

  // 2️⃣ Put commission tx at the beginning

  const txIds = await execute({
    // set sequentially to true means tx will be sent when previous one confirmed
    sequentially: true,
  })

  console.log(
    'note: create market does not support token 2022, if you need more detail error info, set txVersion to TxVersion.LEGACY'
  )
  console.log('create market txIds:', txIds)
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
createMarket();