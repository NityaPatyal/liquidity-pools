import { ethers } from "ethers";
import { addLiquidity } from "../write/addLiquidity";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  const rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const mnemonic = process.env.MNEMONIC!;
  const wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);

  // Tokens on Sepolia
  // const USDC = "0x94a9d9ac8a22534e3faca9f4e7f2e2cf85d5e4c8";
  const USDC = "0xebcc972b6b3eb15c0592be1871838963d0b94278";
  const LINK = "0x779877a7b0d9e8603169ddbd7836e478b4624789";
  const USDT = "0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0";

  // Test with small amounts
  const amountUSDC = ethers.utils.parseUnits("10", 6); // 10 USDC
  console.log("🚀 ~ :18 ~ test ~ amountUSDC:", amountUSDC)

  const amountLINK = ethers.utils.parseEther("0.01"); // 0.01 ETH
  console.log("🚀 ~ :21 ~ test ~ amountLINK:", amountLINK)
  const amountUSDT = ethers.utils.parseUnits("10", 6); // 10 USDT
 
  await addLiquidity(
    USDC,
    USDT,
    wallet,
    amountUSDC,
    amountUSDT
  );

}

test().catch(console.error);
