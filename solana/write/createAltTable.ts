import {
    AddressLookupTableProgram,
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
import dotenv from "dotenv";
import * as bip39 from "bip39";

dotenv.config();
const RPC = process.env.SOL_TESTNET_RPC_URL as string;

const connection = new Connection(RPC, "confirmed");

const MNEMONIC = process.env.MNEMONIC as string;

// Load your wallet (private key)
const seed = bip39.mnemonicToSeedSync(MNEMONIC);
const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString("hex")).key;
const keypair = Keypair.fromSeed(derivedSeed);
const payer = Keypair.fromSecretKey(keypair.secretKey);

async function createLookupTable() {
    const slot = await connection.getSlot();
    const [createIx, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
        authority: payer.publicKey,
        payer: payer.publicKey,
        recentSlot: slot,
    });

    const tx = new Transaction().add(createIx);
    const receipt = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log("🚀 ~ :36 ~ createLookupTable ~ receipt:", receipt)


    console.log("✅ Created ALT:", lookupTableAddress.toBase58());
    return lookupTableAddress;
}
createLookupTable();


