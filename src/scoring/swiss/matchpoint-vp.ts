export interface MatchpointSinglePairResult {
  pairPercentage: number;
  vpAwarded: number;
}

/**
 * Calculates the 20-point Victory Points for a single pair, completely
 * independent of their table opponents.
 *
 * In matchpoint Swiss Pairs the two pairs at a table are NOT a closed system:
 * each pair's score is its result compared against the whole field on the
 * board, so both sides are scored in a vacuum from their own global field
 * percentage. Their VPs therefore rarely sum to 20 — a table can bleed VP into
 * the ether (a poor board for both) or gain it (a good board for both). This is
 * the correct behaviour, so the conversion returns a single pair's award rather
 * than a winner/loser split.
 *
 * @param pairPercentage The pair's field percentage for the round (e.g. 54.5).
 */
export function calculateIndependentMpVP(
  pairPercentage: number,
): MatchpointSinglePairResult {
  if (pairPercentage < 0 || pairPercentage > 100) {
    throw new Error("Percentage must be between 0 and 100");
  }

  // Round to 2 decimal places (standard tournament protocol).
  const x = Math.round(pairPercentage * 100) / 100;
  let vpAwarded: number;

  // Segmented linear scale: extreme caps, then the high, competitive and low
  // segments meeting at the 42.5% / 57.5% breakpoints.
  if (x >= 70.0) vpAwarded = 20.0;
  else if (x <= 30.0) vpAwarded = 0.0;
  else if (x >= 57.5) vpAwarded = (x - 20) * 0.4;
  else if (x > 42.5) vpAwarded = (x - 35) * (2 / 3);
  else vpAwarded = (x - 30) * 0.4;

  return {
    pairPercentage: x,
    vpAwarded: Math.round(vpAwarded * 100) / 100,
  };
}
