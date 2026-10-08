import { BoardOutcome } from "@/model/score";

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
