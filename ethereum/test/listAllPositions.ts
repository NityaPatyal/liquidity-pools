import { ethers } from "ethers";
import { abi as POSITION_MANAGER_ABI } from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import dotenv from "dotenv";
dotenv.config();

// Sepolia NFT_POSITION_MANAGER contract address
const POSITION_MANAGER = "0x1238536071E1c677A632429e3655c799b22cDA52";

export async function listAllPositions(signer: ethers.Signer) {
  const positionManager = new ethers.Contract(POSITION_MANAGER, POSITION_MANAGER_ABI, signer);
  const owner = await signer.getAddress();

  const balance = await positionManager.balanceOf(owner);
  console.log("🧾 LP NFT Count:", balance.toString());

  for (let i = 0; i < balance.toNumber(); i++) {
    const tokenId = await positionManager.tokenOfOwnerByIndex(owner, i);
    const position = await positionManager.positions(tokenId);

    console.log(`📍 Position NFT #${tokenId.toString()}`);
    console.log("Token0:", position.token0);
    console.log("Token1:", position.token1);
    console.log("Liquidity:", position.liquidity.toString());
    console.log("Tick range:", position.tickLower.toString(), "to", position.tickUpper.toString());
    console.log("------");
  }
}

const rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const mnemonic = process.env.MNEMONIC!;
const wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);

listAllPositions(wallet).catch(console.error);

