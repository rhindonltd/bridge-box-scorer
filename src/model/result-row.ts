import type { BoardOutcome } from "@/model/score";
import type { Card } from "@/model/common";
import type { BoardStatus, MatchKind } from "@/model/game-types";

/**
 * Plain row types for a game's results, shared by the modules that score and
 * rule on them. They mirror the `boards` and `matches` tables column for
 * column, so a database row can be passed straight in, but they do not depend
 * on the database layer.
 */

/** One board played at one table in one round (the `boards` table). */
export interface ResultRow {
  section: string;
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  copy: string;
  ns: string;
  ew: string;
  confirmedResult: BoardOutcome | null;
  confirmedLead: Card | null;
  /** Director override, or an encoded ruling (adjusted score, removed board). */
  directorOverrideResult: BoardOutcome | null;
  directorOverrideLead: Card | null;
  matchId: number;
  status: BoardStatus | null;
  /** Played the wrong way round: the result is credited to the opposite pairs. */
  seatsSwapped: boolean;
}

/** One first-class match (the `matches` table). */
export interface MatchRow {
  id: number;
  section: string;
  roundNumber: number;
  kind: MatchKind;
  scoredAsUnit: boolean;
  home: string;
  opponent: string | null;
  groupId: string | null;
  slot: number | null;
  vpPool: number | null;
  boardStart: number;
  boardEnd: number;
  /**
   * The match-level director ruling, as stored: `VOID:<cause>`,
   * `VOIDP:<cause>`, `MM:<side>:<direction>:<fault>`, or null.
   */
  ruling: string | null;
}
