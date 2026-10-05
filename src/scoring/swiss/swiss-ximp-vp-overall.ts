import { PairSwissVpOverallScore } from "@/model/leaderboard";
import { rank } from "@/scoring/overall/rank";
import { SwissVpBoardRow } from "./swiss-vp-overall";
import { VpAccumulator, creditVp } from "./vp-accumulator";
import { scoreSwissVpRound } from "./swiss-vp-round";

/**
 * Compute the Cross-IMP (Butler) Swiss Pairs Victory-Point overall standings.
 *
 * Each pair is scored INDEPENDENTLY against the whole field on every board of
 * the round (not head-to-head against its one table opponent). Per board with
 * `r` scored results in the field and `c = r − 1` comparisons:
 *
 *   XIMP  = sum of the pair's score IMPed against every result in the field
 *   XIMPQ = XIMP / sqrt(r·c / 2)          (normalise across field sizes)
 *
 * A pair's half total is the sum of its per-board XIMPQ, rounded to a whole
 * number of IMPs (exact halves away from the average, i.e. away from zero), then
 * converted to Victory Points on the WBF discrete (integer) scale.
 *
 * A **"2 half matches"** round (odd-field handling) is scored as two halves:
 * each half is converted to VP on a **10-VP half-scale** and the halves summed
 * back to the round's /20; the compensated half a non-anchor missed is credited
 * AVE+/AVE. An ordinary round is a single full-round segment on the 20-VP scale.
 *
 * The per-round math is shared with the USEBIO export via
 * {@link scoreSwissVpRound}; this function just groups rows by round, credits
 * each round's per-pair VP, and ranks. Running estimate: a round with no scored
 * boards yet (or a one-table field) shows the neutral 10 VP. SIT_OUT (bye) rows
 * are skipped; HALF_AVERAGE (compensated-half) rows are kept.
 */
export function calculateSwissXimpVpOverall(
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
    const { pairVp } = scoreSwissVpRound(rows, "XIMP");
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
