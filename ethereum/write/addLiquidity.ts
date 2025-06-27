import { ethers } from "ethers";
import { abi as ERC20_ABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IERC20Minimal.sol/IERC20Minimal.json";
import { abi as POSITION_MANAGER_ABI } from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";

// SEPOLIA V3 UNISWAP POSITION MANAGER CONTRACT
// NFT_POSITION_MANAGER contract address
const POSITION_MANAGER = "0x1238536071E1c677A632429e3655c799b22cDA52";

export async function addLiquidity(
  USDC_ADDRESS: string,
  LINK_ADDRESS: string,
  signer: ethers.Signer,
  amountUSDC: ethers.BigNumber,
  amountLINK: ethers.BigNumber
) {

  const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
  const linkContract = new ethers.Contract(LINK_ADDRESS, ERC20_ABI, signer);
  console.log("🚀 ~ :17 ~ Approving tokens of given address:")

  // 1. Approve tokens
  await usdcContract.approve(POSITION_MANAGER, amountUSDC);
  await linkContract.approve(POSITION_MANAGER, amountLINK);
  console.log("🚀 ~ :21 ~ Approved tokens of USDC address:")

  // 2. Add liquidity to existing pool
  const positionManager = new ethers.Contract(POSITION_MANAGER, POSITION_MANAGER_ABI, signer);
  console.log("🚀 ~ :26 ~ Got Position Manager Contract.")

  const mintParams = {
    token0: USDC_ADDRESS < LINK_ADDRESS ? USDC_ADDRESS : LINK_ADDRESS,
    token1: USDC_ADDRESS > LINK_ADDRESS ? USDC_ADDRESS : LINK_ADDRESS,
    fee: 3000, // 0.3%
    tickLower: -887220,
    tickUpper: 887220,
    amount0Desired: USDC_ADDRESS < LINK_ADDRESS ? amountUSDC : amountLINK,
    amount1Desired: USDC_ADDRESS > LINK_ADDRESS ? amountUSDC : amountLINK,
    amount0Min: 0,
    amount1Min: 0,
    recipient: await signer.getAddress(),
    deadline: Math.floor(Date.now() / 1000) + 60 * 10,
  };

  const mintTx = await positionManager.mint(mintParams);
  await mintTx.wait();

  console.log("Liquidity added! Tx hash:", mintTx.hash);

  const txReceipt = await mintTx.wait();
  const logs = txReceipt.logs;
  console.log("🚀 ~ :49 ~ logs:", logs)

  for (const log of logs) {
    if (log.address.toLowerCase() === POSITION_MANAGER.toLowerCase()) {
      const iface = new ethers.utils.Interface(POSITION_MANAGER_ABI);
      try {
        const parsedLog = iface.parseLog(log);
        if (parsedLog.name === "IncreaseLiquidity" || parsedLog.name === "Mint") {
          console.log("🎯 Minted Position NFT ID:", parsedLog.args.tokenId.toString());
        }
      } catch (e) {
        // skip unknown logs
      }
    }
  }
}