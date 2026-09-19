import { PairSwissVpOverallScore } from "@/model/leaderboard";
import { scoreMP } from "@/scoring/traveller/pair/mp";
import { rank } from "@/scoring/overall/rank";
import { calculateIndependentMpVP } from "./matchpoint-vp";
import { NEUTRAL_VP, SwissVpBoardRow } from "./swiss-vp-overall";
import { boardResult } from "./team-match";

interface Accumulator {
  /** Matchpoints earned across the round's scored boards. */
  mp: number;
  /** Matchpoints available across those boards (the field top summed). */
  max: number;
  /** Board numbers this pair played in the round (to detect a full round). */
  boards: Set<number>;
}

interface RoundTotals {
  totalVP: number;
  vpByRound: Record<number, number>;
}

/**
 * Compute the matchpoint Swiss Pairs Victory-Point overall standings.
 *
 * Unlike the IMP variant (a head-to-head margin at one table), matchpoint VP
 * measures each pair against the **whole section's field** on the round's
 * boards: every table that played a board is compared together (the normal
 * matchpoint field), giving each pair a percentage for the round. That
 * percentage converts to Victory Points on the 20-point matchpoint scale, and a
 * pair's session result is the sum of its per-round VPs, ranked highest-first.
 *
 * A pair's round is credited only once every board it played that round has a
 * result; until then the round stays blank for that pair. Sit-out (bye) rows
 * carry no field result and are skipped, leaving that round blank for the pair.
 */
export function calculateSwissMpVpOverall(
  boardRows: SwissVpBoardRow[],
): PairSwissVpOverallScore {
  // Group played rows by round, then by board number, so each board can be
  // scored against its full field for the round.
  const rounds = new Map<number, Map<number, SwissVpBoardRow[]>>();
  for (const row of boardRows) {
    if (row.status === "SIT_OUT") continue;
    const byBoard = rounds.get(row.roundNumber) ?? new Map();
    const arr = byBoard.get(row.boardNumber) ?? [];
    arr.push(row);
    byBoard.set(row.boardNumber, arr);
    rounds.set(row.roundNumber, byBoard);
  }

  const totals = new Map<string, RoundTotals>();

  for (const [round, byBoard] of rounds) {
    // Per-pair accumulation of matchpoints and completeness for this round.
    const perPair = new Map<string, Accumulator>();

    const ensure = (pairId: string): Accumulator => {
      const acc = perPair.get(pairId) ?? {
        mp: 0,
        max: 0,
        boards: new Set<number>(),
      };
      perPair.set(pairId, acc);
      return acc;
    };

    for (const [boardNumber, rows] of byBoard) {
      // Record which pairs are expected to have this board this round.
      for (const row of rows) {
        ensure(row.ns).boards.add(boardNumber);
        ensure(row.ew).boards.add(boardNumber);
      }

      // Score the board against the full field for the round (all tables that
      // played it). Only rows with a result take part in the comparison.
      const scored = scoreMP(
        boardNumber,
        rows
          .filter((r) => boardResult(r) != null)
          .map((r) => ({
            nsId: r.ns,
            ewId: r.ew,
            outcome: boardResult(r)!,
          })),
      );

      for (const line of scored) {
        const ns = ensure(line.nsId);
        ns.mp += line.nsMatchPoints;
        ns.max += line.maxMatchPoints;

        const ew = ensure(line.ewId);
        ew.mp += line.ewMatchPoints;
        ew.max += line.maxMatchPoints;
      }
    }

    for (const [pairId, acc] of perPair) {
      // A pair with no board this round isn't in it (bye / not drawn); leave
      // the round empty for them.
      /* v8 ignore next -- unreachable: every pair added to perPair gets a board recorded in the same loop iteration, so boards.size is never 0 here */
      if (acc.boards.size === 0) continue;

      // Running estimate over the boards scored so far, against whatever field
      // exists at this moment. Before any comparison is possible for this pair
      // (no scored board yet, or a field with a single table so max is 0) the
      // round shows the neutral average of 10 VP; it refines as results land.
      // This live percentage is a "barometer" figure that can swing until every
      // table in the field has entered the round's boards.
      let vp: number;
      if (acc.max === 0) {
        vp = NEUTRAL_VP;
      } else {
        vp = calculateIndependentMpVP((acc.mp / acc.max) * 100).vpAwarded;
      }

      const running = totals.get(pairId) ?? { totalVP: 0, vpByRound: {} };
      running.vpByRound[round] = vp;
      running.totalVP = Math.round((running.totalVP + vp) * 100) / 100;
      totals.set(pairId, running);
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
