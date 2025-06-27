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