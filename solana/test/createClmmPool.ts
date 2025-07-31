import { Keypair } from "@solana/web3.js";
// import {createClmmPool} from "../write/createClmmPool.mainnet";
import { createClmmPool } from "../write/createClmmPool.devnet";

import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import dotenv from "dotenv";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
dotenv.config();

const MNEMONIC = process.env.MNEMONIC;

// Derive Solana private key from mnemonic
function getSolanaKeypairFromMnemonic(
  mnemonic: string,
  derivationPath = "m/44'/501'/0'/0'"
) {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derivedSeed = derivePath(derivationPath, seed.toString("hex")).key;
  const keypair = Keypair.fromSeed(derivedSeed);

  return keypair;
}

// Example usage
const keypair = getSolanaKeypairFromMnemonic(MNEMONIC as string);
const privateKeyBytes = keypair.secretKey; // bytes
const privateKey =
  "UQpNr8mNGA5vHD1EjwV3xf2Ly3ctKCikk7Z2uNvVL8rjayyeQQn1iUfANuxCsrKTJ5uksjFdaiooN1G16MBdQ8u";
const privateKeyBase58 = bs58.encode(privateKeyBytes);
console.log("🚀 ~ privateKeyBase58:", privateKeyBase58);
console.log("publicKey: ", keypair.publicKey.toString());

createClmmPool({
  privateKeyBase58: privateKey,
  mint1: "So11111111111111111111111111111111111111112", // Unknow Token 2: 5zT9qL
  mint2: "USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT", // Unknown Token 1: GJ6Eno
  // mint1: "So11111111111111111111111111111111111111112", //WSOL
  // // mint2: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" //USDC
  // mint2: "3K6rftdAaQYMPunrtNRHgnK2UAtjm2JwyT2oCiTDouYE" // XCOPE
});
