import { BoardOutcome } from "@/model/score";
import type { SwissVpMatch } from "./swiss-vp-round";

/**
 * Shared types/constants for the Swiss Pairs Victory-Point scorers.
 *
 * The concrete scorers live alongside this file — matchpoint
 * (`swiss-mp-vp-overall.ts`) and cross-IMP (`swiss-ximp-vp-overall.ts`) — and
 * both consume these. (The old head-to-head "Butler" scorer that lived here was
 * removed: Swiss Pairs is scored by matchpoints or cross-IMP, never a per-table
 * head-to-head IMP split.)
 */

/**
 * The minimal board-row shape the Swiss VP aggregation needs. Kept structural
 * (rather than importing the Drizzle `Board` type) so the scorers stay pure,
 * framework-free modules that unit tests can drive with plain objects.
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
  /**
   * The match this board belongs to (FK → matches.id). Used to attach the
   * match-level director rulings (§3.3.8 void-pair, §3.5 mismatch), which now
   * live on the match row, not the board.
   */
  matchId?: number;
}

/**
 * The neutral running VP shown for a round that has been drawn but has no
 * results yet: half of the 20-point pool, i.e. a dead-average match.
 */
export const NEUTRAL_VP = 10;

/**
 * Victory Points awarded to a pair or team that sits out a round (an odd-field
 * bye). An average-plus award (2 above the neutral 10, the White Book's AVE+ on
 * a 20–0 scale): a forced bye should not disadvantage — and slightly favours —
 * the sitting side, without matching a strong win. The same for matchpoint and
 * cross-IMP Swiss Pairs, and for Swiss Teams.
 */
export const BYE_VP = 12;

/** One Swiss Pairs bye: the sitting pair and the round it sat out. */
export interface SwissPairsBye {
  /** The bye pair's id, as its board rows carry it (the BYE match's `home`). */
  pairId: string;
  round: number;
}

/**
 * The Swiss Pairs byes, from the authoritative `matches` rows (the BYE kind).
 * A BYE match names the sitting pair (`home`) and the round; the scorers credit
 * that pair {@link BYE_VP} for the round.
 */
export function swissPairsByes(
  matchRows: readonly { kind: string; home: string; roundNumber: number }[],
): SwissPairsBye[] {
  return matchRows
    .filter((m) => m.kind === "BYE")
    .map((m) => ({ pairId: m.home, round: m.roundNumber }));
}

/**
 * One Swiss Pairs match as the round was scored, with the table's board row for
 * each of its boards. `scoreEvent` turns it into the kernel `PairsMatchResult`.
 */
export interface SwissPairsMatchDetail<
  R extends SwissVpBoardRow,
> extends SwissVpMatch {
  round: number;
  /** The match's board rows, in board order. */
  rows: R[];
}

/**
 * The detail of one scored match: the row where this NS/EW pair sat for each
 * of the match's boards (either way round). The match's board numbers come from
 * these same rows, so every board has a row.
 */
export function pairsMatchDetail<R extends SwissVpBoardRow>(
  round: number,
  rows: R[],
  match: SwissVpMatch,
): SwissPairsMatchDetail<R> {
  const found = match.boardNumbers.flatMap((boardNumber) =>
    rows
      .filter(
        (r) =>
          r.boardNumber === boardNumber &&
          ((r.ns === match.nsId && r.ew === match.ewId) ||
            (r.ns === match.ewId && r.ew === match.nsId)),
      )
      .slice(0, 1),
  );
  return { ...match, round, rows: found };
}
