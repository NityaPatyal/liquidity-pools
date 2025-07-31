import { ethers } from "ethers";
import { createUniswapV3Pool } from "../write/createUniswapV3Pool";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  const rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const mnemonic = process.env.MNEMONIC!;
  const wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);

  // Tokens on Sepolia
  const USDC = "0xebcc972b6b3eb15c0592be1871838963d0b94278";
  // const SHT = "0xe7593c95763E75165d6B3e8477470169a5fe4d7a";
  // const LINK = "0x779877a7b0d9e8603169ddbd7836e478b4624789";
  const USDT = "0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0";
  const Eth = ""

  // Test with small amounts
  const amountUSDC = ethers.utils.parseUnits("10", 6); // 10 USDC
  const amountUSDT = ethers.utils.parseUnits("10", 6); // 10 USDC
  // const amountSHT = ethers.utils.parseUnits("10", 18); // 10 6SHT
  // const amountLINK = ethers.utils.parseEther("0.01"); // 0.01 ETH

  const poolAddress = await createUniswapV3Pool(
    USDC,
    USDT,
    wallet,
    amountUSDC,
    amountUSDT,
    6,
    6
  );

  console.log("Pool:", poolAddress);
}

test().catch(console.error);
