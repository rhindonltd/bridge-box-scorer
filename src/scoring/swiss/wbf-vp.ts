export interface VPResult {
  winnerVP: number;
  loserVP: number;
}

/**
 * Calculates the 20-point WBF Victory Points (VP) for a match.
 * Supports both Continuous (decimal) and Discrete (whole-integer) scales.
 *
 * @param boards The total number of boards played in the match (e.g. 8, 12, 16, 24).
 * @param impMargin The net IMP margin of the winning side (sign is ignored).
 * @param type 'continuous' for decimal precision, 'discrete' for traditional integer bands.
 */
export function calculateWbfVP(
  boards: number,
  impMargin: number,
  type: "continuous" | "discrete" = "continuous",
): VPResult {
  // Ensure the IMP margin is non-negative for formula constraints.
  const margin = Math.abs(impMargin);

  // 1. Calculate the 'blitz point' (the cap where 20 VPs are awarded).
  //    Standard WBF coefficient is 15 * sqrt(N).
  const blitzPoint = 15 * Math.sqrt(boards);

  let winnerVP: number;

  // 2. Apply the asymptotic golden-ratio curve if below the blitz threshold.
  if (margin >= blitzPoint) {
    winnerVP = 20.0;
  } else if (margin === 0) {
    winnerVP = 10.0;
  } else {
    const tau = (Math.sqrt(5) - 1) / 2; // Golden ratio (~0.61803398)
    const denominator = 1 - Math.pow(tau, 3);

    // Core exponential formula mapping the IMP fraction to the VP curve.
    const exponent = (3 * margin) / blitzPoint;
    const rawValue = 10.0 + (10.0 * (1 - Math.pow(tau, exponent))) / denominator;

    // Continuous scale uses standard rounding to 2 decimal places.
    winnerVP = Math.round(rawValue * 100) / 100;
  }

  // 3. Handle formatting for Continuous vs. Discrete scales.
  if (type === "discrete") {
    // Discrete scale rounds the winner's points to the nearest whole integer.
    winnerVP = Math.round(winnerVP);
  }

  // The total pool of available VPs between both sides is always exactly 20.00.
  const loserVP =
    type === "continuous"
      ? Math.round((20.0 - winnerVP) * 100) / 100
      : 20 - winnerVP;

  return {
    winnerVP,
    loserVP,
  };
}
