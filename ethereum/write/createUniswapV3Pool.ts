import { ethers } from "ethers";
import { abi as ERC20_ABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IERC20Minimal.sol/IERC20Minimal.json";
import { abi as FACTORY_ABI } from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import { abi as POSITION_MANAGER_ABI } from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import JSBI from "jsbi";

// Constants
// SEPOLIA V3 UNISWAP Factory Contract
// UNISWAP_V3_FACTORY
const FACTORY_ADDRESS = "0x0227628f3F023bb0B980b67D528571c95c6DaC1c";
// SEPOLIA V3 UNISWAP POSITION MANAGER CONTRACT
// NFT_POSITION_MANAGER contract address
const POSITION_MANAGER = "0x1238536071E1c677A632429e3655c799b22cDA52";

const FEE_TIER = 3000; // 0.3%

// Helper to get sqrtPriceX96
const encodePriceSqrt = (reserve1: number, reserve0: number): string => {
  const ratio = JSBI.divide(
    JSBI.BigInt(Math.floor(Math.sqrt(reserve1 / reserve0) * 2 ** 96 * 1e6)),
    JSBI.BigInt(1e6)
  );
  return ratio.toString();
};

export async function createUniswapV3Pool(
  tokenA: string,
  tokenB: string,
  signer: ethers.Signer,
  amountA: ethers.BigNumber,
  amountB: ethers.BigNumber
) {
  const address = await signer.getAddress();
  console.log("🚀 ~ address:", address);
  const provider = signer.provider;
  if (!provider) throw new Error("Signer must have a provider");

  const tokenAContract = new ethers.Contract(tokenA, ERC20_ABI, signer);
  const tokenBContract = new ethers.Contract(tokenB, ERC20_ABI, signer);

  // 1. Check balances
  const balanceA = await tokenAContract.balanceOf(address);
  console.log("🚀 ~ balanceA:", balanceA);

  const balanceB = await tokenBContract.balanceOf(address);
  console.log("🚀 ~ balanceB:", balanceB);

  if (balanceA.lt(amountA) || balanceB.lt(amountB)) {
    throw new Error("Insufficient balance for one of the tokens");
  }

  console.log("47: ");

  // 2. Approve both tokens to PositionManager
  const approveTxA = await tokenAContract.approve(POSITION_MANAGER, balanceA);
  const recepit1 = await approveTxA.wait();
  console.log(
    "🚀 ~ recepit1.hash for approval for Token A:",
    recepit1.transactionHash
  );

  const approveTxB = await tokenBContract.approve(POSITION_MANAGER, balanceB);
  const receipt2 = await approveTxB.wait();
  console.log(
    "🚀 ~ receipt2.hash for approval for Token B:",
    receipt2.transactionHash
  );

  console.log("54: ");

  // 3. Create pool (if not exists)
  const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

  const [token0, token1] =
    tokenA.toLowerCase() < tokenB.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA];

  console.log("🚀 ~ token0, token1:", token0, token1);

  let poolAddress = await factory.getPool(token0, token1, FEE_TIER);
  console.log("🚀 ~ poolAddress:", poolAddress);

  console.log(
    "poolAddress === ethers.constants.AddressZero: ",
    poolAddress === ethers.constants.AddressZero
  );

  if (poolAddress === ethers.constants.AddressZero) {
    console.log("🆕 Pool does not exist. You can create it.");
    const createTx = await factory.createPool(tokenA, tokenB, FEE_TIER);
    const receipt = await createTx.wait();
    console.log("Receipt.txHash: ", receipt.transactionHash);
    poolAddress = await factory.getPool(tokenA, tokenB, FEE_TIER);
    console.log("🚀 ~ 67: poolAddress:", poolAddress);
  } else {
    console.log("✅ Pool already exists:", poolAddress);
  }

  // 4. Initialize pool (if not yet initialized)
  const poolContract = new ethers.Contract(
    poolAddress,
    [
      "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
      "function initialize(uint160 sqrtPriceX96) external",
    ],
    signer
  );

  try {
    const slot0 = await poolContract.slot0();
    const isInitialized = !ethers.BigNumber.from(slot0.sqrtPriceX96).isZero();
    console.log("🧪 slot0:", slot0);

    if (!isInitialized) {
      console.log("⚠️ Pool not initialized. Initializing now...");

      // Convert BigNumber to number for JS math (approximate, use string if high precision needed)
      const reserve0 = parseFloat(ethers.utils.formatUnits(amountA, 18));
      const reserve1 = parseFloat(ethers.utils.formatUnits(amountB, 18));

      const sqrtPriceX96 = encodePriceSqrt(reserve1, reserve0); // Adjust ratio if needed
      console.log("💡 sqrtPriceX96 to initialize:", sqrtPriceX96);

      const initTx = await poolContract.initialize(sqrtPriceX96);
      const initReceipt = await initTx.wait();
      console.log("✅ Pool initialized in tx:", initReceipt.transactionHash);
    } else {
      console.log(
        "✅ Pool already initialized. sqrtPriceX96:",
        slot0.sqrtPriceX96.toString()
      );
    }
  } catch (e) {
    console.error("❌ Failed to read or initialize pool:", e);
    throw e;
  }

  // 5. Add liquidity using NonfungiblePositionManager
  const positionManager = new ethers.Contract(
    POSITION_MANAGER,
    POSITION_MANAGER_ABI,
    signer
  );
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  const mintParams = {
    token0: token0,
    token1: token1,
    fee: FEE_TIER,
    tickLower: -887220,
    tickUpper: 887220,
    amount0Desired: tokenA < tokenB ? amountA : amountB,
    amount1Desired: tokenA > tokenB ? amountA : amountB,
    amount0Min: 0,
    amount1Min: 0,
    recipient: address,
    deadline,
  };
  console.log("🚀 ~ mintParams:", mintParams);

  const mintTx = await positionManager.mint(mintParams);
  const receipt = await mintTx.wait();

  console.log("Mint done. Tx hash:", mintTx.hash);

  console.log("✅ liquidity added at:", poolAddress);

  const logs = receipt.logs;
  console.log("🚀 ~ :113 ~ logs:", logs);

  return poolAddress;
}
