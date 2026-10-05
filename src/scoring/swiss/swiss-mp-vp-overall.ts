import { PairSwissVpOverallScore } from "@/model/leaderboard";
import { rank } from "@/scoring/overall/rank";
import { SwissVpBoardRow } from "./swiss-vp-overall";
import { VpAccumulator, creditVp } from "./vp-accumulator";
import { scoreSwissVpRound } from "./swiss-vp-round";

/**
 * Compute the matchpoint Swiss Pairs Victory-Point overall standings.
 *
 * Unlike a head-to-head margin at one table, matchpoint VP measures each pair
 * against the **whole section's field** on the round's boards: every table that
 * played a board is compared together (the normal matchpoint field), giving
 * each pair a percentage. That percentage converts to Victory Points on the
 * 20-point matchpoint scale (discrete/integer), and a pair's session result is
 * the sum of its per-round VPs, ranked highest-first.
 *
 * A **"2 half matches"** round (odd-field handling) is scored as two halves,
 * each matchpointed against the field restricted to its board subset and
 * converted to VP on a **10-VP half-scale**, summed back to the round's /20; the
 * compensated half a non-anchor missed is credited AVE+/AVE. An ordinary round
 * is one full-round segment on the 20-VP scale.
 *
 * The per-round math is shared with the USEBIO export via
 * {@link scoreSwissVpRound}; this function just groups rows by round, credits
 * each round's per-pair VP, and ranks. A round with no comparison yet (no scored
 * board, or a single-table field) shows the neutral 10 VP. SIT_OUT (bye) rows
 * are skipped.
 */
export function calculateSwissMpVpOverall(
  boardRows: SwissVpBoardRow[],
): PairSwissVpOverallScore {
  const rounds = new Map<number, SwissVpBoardRow[]>();
  for (const row of boardRows) {
    if (row.status === "SIT_OUT") continue;
    const arr = rounds.get(row.roundNumber) ?? [];
    arr.push(row);
    rounds.set(row.roundNumber, arr);
  }

  const totals = new Map<string, VpAccumulator>();
  for (const [round, rows] of rounds) {
    const { pairVp } = scoreSwissVpRound(rows, "MP");
    for (const [pairId, vp] of pairVp) {
      creditVp(totals, pairId, round, vp);
    }
  }

  const lines = rank(
    Array.from(totals.entries()).map(([pairId, acc]) => ({
      pairId,
      totalVP: acc.totalVP,
      vpByRound: acc.vpByRound,
    })),
    (row) => row.totalVP,
  );

  return {
    type: "PAIR_SWISS_VP",
    mode: "PAIR",
    scoring: "SWISS_VP",
    lines,
  };
}
