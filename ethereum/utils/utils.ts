import { encodeSqrtRatioX96, TickMath} from "@uniswap/v3-sdk";
import JSBI from "jsbi";

// Log base 1.0001
export function logBase1_0001(x: number): number {
  return Math.log(x) / Math.log(1.0001);
}

// Round to nearest tick spacing
export function nearestUsableTick(tick: number, tickSpacing: number): number {
  return Math.round(tick / tickSpacing) * tickSpacing;
}

/**
 * Calculate tickLower and tickUpper based on price range
 * @param priceToken1PerToken0  — price of token1 in terms of token0 (e.g. 1 LINK = 10 USDC → 10)
 * @param spread                — e.g. 0.2 for ±20% spread
 * @param tickSpacing           — typically 60 for fee tier 0.3% (3000)
 * 
 * const { tickLower, tickUpper } = getTickRangeFromPrice(10, 0.2, 60);
 * console.log("tickLower:", tickLower, "tickUpper:", tickUpper);
 * 
 *    This assumes: 1 LINK = 10 USDC
 *    You want ±20% coverage
 *    Tick spacing of 60 (Uniswap V3, 0.3% fee)
 */
export function getTickRangeFromPrice(
  priceToken1PerToken0: number,
  spread: number = 0.2,
  tickSpacing: number = 60
): { tickLower: number; tickUpper: number } {
  const lowerPrice = priceToken1PerToken0 * (1 - spread);
  const upperPrice = priceToken1PerToken0 * (1 + spread);

  const rawTickLower = Math.floor(logBase1_0001(lowerPrice));
  const rawTickUpper = Math.ceil(logBase1_0001(upperPrice));

  const tickLower = nearestUsableTick(rawTickLower, tickSpacing);
  const tickUpper = nearestUsableTick(rawTickUpper, tickSpacing);

  return { tickLower, tickUpper };
}

// export function getTickRange(
//   priceLower: number,
//   priceUpper: number,
//   feeTier: number
// ): { tickLower: number; tickUpper: number } {
//   const sqrtPriceLowerX96 = encodeSqrtRatioX96(1, priceUpper);
//   const sqrtPriceUpperX96 = encodeSqrtRatioX96(1, priceLower);

//   let tickLower = TickMath.getTickAtSqrtRatio(sqrtPriceLowerX96);
//   let tickUpper = TickMath.getTickAtSqrtRatio(sqrtPriceUpperX96);

//   // Calculate tickSpacing based on fee tier (per Uniswap V3 convention)
//   const tickSpacing = getTickSpacing(feeTier);

//   // Align ticks to spacing
//   tickLower = Math.floor(tickLower / tickSpacing) * tickSpacing;
//   tickUpper = Math.ceil(tickUpper / tickSpacing) * tickSpacing;

//   return { tickLower, tickUpper };
// }

function getTickSpacing(feeTier: number): number {
  switch (feeTier) {
    case 100: return 1;
    case 500: return 10;
    case 3000: return 60;
    case 10000: return 200;
    default:
      throw new Error("Unsupported fee tier");
  }
}


/**
 * Returns sqrtPriceX96 using integer-safe encoding.
 * @param reserve1 Token1 reserve (quote token)
 * @param reserve0 Token0 reserve (base token)
 */
export function encodePriceSqrt(reserve1: number, reserve0: number): JSBI {
  const scale = 1e6; // to preserve precision and avoid float
  const numerator = JSBI.BigInt(Math.floor(reserve1 * scale));
  const denominator = JSBI.BigInt(Math.floor(reserve0 * scale));

  return encodeSqrtRatioX96(numerator, denominator);
}

/**
 * Calculates tickLower and tickUpper based on desired price bounds.
 * Handles float safely using scaled integers.
 */
export function getTickRange(
  priceLower: number,
  priceUpper: number,
  feeTier: number
): { tickLower: number; tickUpper: number } {
  const sqrtPriceLowerX96 = encodePriceSqrt(1, priceUpper); // 1/upper
  const sqrtPriceUpperX96 = encodePriceSqrt(1, priceLower); // 1/lower

  let tickLower = TickMath.getTickAtSqrtRatio(sqrtPriceLowerX96);
  let tickUpper = TickMath.getTickAtSqrtRatio(sqrtPriceUpperX96);

  // Round ticks to match the spacing
  const tickSpacing = getTickSpacing(feeTier);

  tickLower = Math.floor(tickLower / tickSpacing) * tickSpacing;
  tickUpper = Math.ceil(tickUpper / tickSpacing) * tickSpacing;

  return { tickLower, tickUpper };
}