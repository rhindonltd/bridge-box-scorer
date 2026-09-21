import { PairSwissVpOverallScore } from "@/model/leaderboard";
import { BoardOutcome } from "@/model/score";
import { scoreIMP } from "@/scoring/traveller/pair/imp";
import { rank } from "@/scoring/overall/rank";
import { calculateWbfVP } from "./wbf-vp";
import { boardResult } from "./team-match";
import { VpAccumulator, creditVp } from "./vp-accumulator";

/**
 * The minimal board-row shape the Swiss VP aggregation needs. Kept structural
 * (rather than importing the Drizzle `Board` type) so this stays a pure,
 * framework-free scoring module that unit tests can drive with plain objects.
 */
export interface SwissVpBoardRow {
  section: string;
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  ns: string;
  ew: string;
  confirmedResult: BoardOutcome | null;
  directorOverrideResult: BoardOutcome | null;
  /** Board status; "SIT_OUT" rows are byes and carry no head-to-head result. */
  status: string | null;
}

/**
 * The neutral running VP shown for a round that has been drawn but has no
 * results yet: half of the 20-point pool, i.e. a dead-average match.
 */
export const NEUTRAL_VP = 10;

/** Group key for one Swiss match: a single table's seating within one round. */
function matchKey(row: SwissVpBoardRow): string {
  return `${row.section}|${row.roundNumber}|${row.tableNumber}`;
}

/**
 * Compute the Swiss Pairs Victory-Point overall standings from a game's board
 * rows.
 *
 * Each Swiss round pits two pairs against each other across a set of boards at
 * one table. The net IMP margin over those boards converts to Victory Points
 * (VP) via the WBF 20-VP scale; the winning pair takes `winnerVP`, the other
 * `loserVP`. A pair's session result is the sum of its per-round VPs, and pairs
 * rank highest-total-first.
 *
 * A round's match only contributes VP once every one of its boards has a
 * result: a partially-entered round is left out (its cell stays empty) until
 * the table finishes. Sit-out (bye) rows carry no opponent and are skipped;
 * a bye simply leaves that round blank for the pair.
 */
export function calculateSwissVpOverall(
  boardRows: SwissVpBoardRow[],
): PairSwissVpOverallScore {
  // Bucket rows into per-table, per-round matches.
  const matches = new Map<string, SwissVpBoardRow[]>();
  for (const row of boardRows) {
    if (row.status === "SIT_OUT") continue;
    const key = matchKey(row);
    const arr = matches.get(key) ?? [];
    arr.push(row);
    matches.set(key, arr);
  }

  const totals = new Map<string, VpAccumulator>();

  for (const rows of matches.values()) {
    const first = rows[0];
    const round = first.roundNumber;
    const nsId = first.ns;
    const ewId = first.ew;

    // A running estimate over the boards scored so far: an in-progress round
    // shows a live VP rather than a blank. Until any board has a result the
    // round shows the neutral average of 10 VP each; each completed board
    // refines the estimate on the WBF scale for the boards played so far.
    const scoredRows = rows.filter((r) => boardResult(r) != null);

    if (scoredRows.length === 0) {
      // Match drawn but not started: both pairs sit at the average until a
      // result lands.
      creditVp(totals, nsId, round, NEUTRAL_VP);
      creditVp(totals, ewId, round, NEUTRAL_VP);
      continue;
    }

    // Sum per-board IMPs across the scored boards to get the net margin, and
    // score it on the WBF scale for that number of boards (not the full round
    // length): a lead over fewer boards is worth more, so the live estimate
    // tracks the boards actually played.
    let nsImps = 0;
    let ewImps = 0;
    for (const row of scoredRows) {
      const outcome = boardResult(row)!;
      const [line] = scoreIMP(row.boardNumber, [{ nsId, ewId, outcome }]);
      nsImps += line.nsImps;
      ewImps += line.ewImps;
    }

    const margin = nsImps - ewImps;
    const boardsPlayed = scoredRows.length;
    const { winnerVP, loserVP } = calculateWbfVP(boardsPlayed, margin);

    // A non-negative margin means NS won (a zero margin is a tie: both sides
    // receive the "loser" 10.0 split, which equals winnerVP at margin 0).
    if (margin >= 0) {
      creditVp(totals, nsId, round, winnerVP);
      creditVp(totals, ewId, round, loserVP);
    } else {
      creditVp(totals, ewId, round, winnerVP);
      creditVp(totals, nsId, round, loserVP);
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
