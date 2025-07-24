import { Keypair } from "@solana/web3.js";
import {createClmmPool} from "../write/createClmmPool.testnet";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import dotenv from "dotenv";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
dotenv.config();

const MNEMONIC = process.env.MNEMONIC;


// Derive Solana private key from mnemonic
function getSolanaKeypairFromMnemonic(mnemonic: string, derivationPath = "m/44'/501'/0'/0'") {
  console.log(typeof bip39.mnemonicToSeedSync); // should log 'function'

  const seed = bip39.mnemonicToSeedSync(mnemonic);
  console.log("🚀 ~ :15 ~ getSolanaKeypairFromMnemonic ~ seed:", seed)

  const derivedSeed = derivePath(derivationPath, seed.toString("hex")).key;
  const keypair = Keypair.fromSeed(derivedSeed);

  return keypair;
}

// Example usage
const keypair = getSolanaKeypairFromMnemonic(MNEMONIC as string);
const privateKeyBytes = keypair.secretKey; // bytes
const privateKeyBase58 = bs58.encode(privateKeyBytes);
console.log("publicKey: ",keypair.publicKey.toString())


createClmmPool({
  privateKeyBase58: privateKeyBase58,
  mint1: "5zT9qL6L1BnCJ9ptWXE7HmCoG93Q5qdZZvDuJMMAiBjs", // Wrapped Sol
  mint2: "GJ6EnoBbDsAoyGkxEv1dxh7fi5vq3cUyTfhnA5YJ9NyW", // Unknown Token 1: GJ6Eno
});