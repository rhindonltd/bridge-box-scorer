export interface VPResult {
  winnerVP: number;
  loserVP: number;
}

/**
 * The Victory Points (on the 20-point WBF scale) for ONE side given its signed
 * IMP result over a match's boards.
 *
 * This is the single-sided core of the WBF scale: a side with a positive IMP
 * result scores above the neutral 10 (up to 20 at the blitz point), a negative
 * result scores the mirror below 10, and a dead-even 0 scores exactly 10. The
 * curve is the WBF golden-ratio asymptote; `boards` sets the blitz point
 * (`15 * sqrt(boards)`, where 20 VP is reached).
 *
 * Used directly where each participant is scored INDEPENDENTLY against the
 * field (Swiss Pairs cross-IMP: a pair's own cross-IMP total → VP, two pairs at
 * a table NOT summing to 20), and as the building block of the two-sided
 * {@link calculateWbfVP} split used for head-to-head teams matches.
 *
 * @param boards The number of boards the result spans (sets the blitz point).
 * @param imps   The side's SIGNED IMP result (positive = above the field).
 * @param type   'continuous' for 2-dp decimals, 'discrete' for whole integers.
 */
export function impsToVp(
  boards: number,
  imps: number,
  type: "continuous" | "discrete" = "continuous",
): number {
  const magnitude = Math.abs(imps);

  // The 'blitz point': the IMP margin at which a side reaches the full 20 VP.
  const blitzPoint = 15 * Math.sqrt(boards);

  // The VP for the magnitude as a WINNING amount (>= 10), on the WBF curve.
  let winnerVP: number;
  if (magnitude >= blitzPoint) {
    winnerVP = 20.0;
  } else if (magnitude === 0) {
    winnerVP = 10.0;
  } else {
    const tau = (Math.sqrt(5) - 1) / 2; // Golden ratio (~0.61803398)
    const denominator = 1 - Math.pow(tau, 3);
    const exponent = (3 * magnitude) / blitzPoint;
    const rawValue =
      10.0 + (10.0 * (1 - Math.pow(tau, exponent))) / denominator;
    winnerVP = Math.round(rawValue * 100) / 100;
  }

  if (type === "discrete") {
    winnerVP = Math.round(winnerVP);
  }

  // A negative result scores the mirror below 10 (the "loser" side of a
  // notional 20-point pool); zero scores exactly 10.
  if (imps < 0) {
    return type === "continuous"
      ? Math.round((20.0 - winnerVP) * 100) / 100
      : 20 - winnerVP;
  }
  return winnerVP;
}

/**
 * Calculates the 20-point WBF Victory Points (VP) for a two-sided (head-to-head)
 * match: the winner takes the VP for the margin, the loser the mirror, summing
 * to exactly 20. Supports Continuous (decimal) and Discrete (integer) scales.
 *
 * A thin wrapper over {@link impsToVp}: the winner is `impsToVp(boards, |margin|)`
 * and the loser `impsToVp(boards, -|margin|)`.
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
  const margin = Math.abs(impMargin);
  return {
    winnerVP: impsToVp(boards, margin, type),
    loserVP: impsToVp(boards, -margin, type),
  };
}
