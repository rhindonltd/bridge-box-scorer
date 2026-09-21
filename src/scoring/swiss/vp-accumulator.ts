/**
 * Per-participant Victory-Point accumulation shared by the Swiss VP overall
 * scorers (Swiss Pairs IMP-VP, Swiss Teams VP, Swiss Pairs MP-VP). Holds the
 * running session total and the per-round VP breakdown, keyed by the
 * participant's id (a pair id or a team id).
 */
export interface VpAccumulator {
  totalVP: number;
  vpByRound: Record<number, number>;
}

/**
 * Credit a participant its Victory Points for a round.
 *
 * A participant plays at most one match per round, so the round value is an
 * assignment (not an addition), while the session total sums across rounds. The
 * total is rounded to two decimals to keep the WBF scale's tenths clean under
 * repeated addition.
 */
export function creditVp(
  totals: Map<string, VpAccumulator>,
  id: string,
  round: number,
  vp: number,
): void {
  const acc = totals.get(id) ?? { totalVP: 0, vpByRound: {} };
  acc.vpByRound[round] = vp;
  acc.totalVP = Math.round((acc.totalVP + vp) * 100) / 100;
  totals.set(id, acc);
}
