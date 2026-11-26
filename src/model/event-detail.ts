import type { BoardOutcome } from "@/model/score";
import type { Card } from "@/model/common";

/**
 * Per-line and per-match results from one scoring run, alongside the standings
 * (`EventScore` in the scoring module). They hold the figures the standings
 * were built from, so a consumer that shows them (the USEBIO export) agrees
 * with the leaderboard by construction.
 *
 * Every result is tagged with the `field` it was scored in: a section letter,
 * or the combined label (the game id) when every section is pooled. The same
 * board or match therefore appears once per field that was scored.
 */

/** One table's result on one board, as a traveller shows it. */
export interface RoomResult {
  section: string;
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  /** The scored ids at the table, as on the ruled rows (handover ids included). */
  ns: string;
  ew: string;
  /** The result: a director override wins over the confirmed result. */
  outcome: BoardOutcome | null;
  /** The opening lead: a director-corrected lead wins over the confirmed one. */
  lead: Card | null;
  /** The contract score from North/South's side; null when there is none. */
  nsScore: number | null;
  /**
   * Played the wrong way round. Pairs rows are already exchanged by the
   * rulings; a teams row keeps its ids and the scorer credits the opposite
   * side, so a consumer naming the partnerships exchanges them itself.
   */
  seatsSwapped: boolean;
}

/** One board-pooled pairs traveller line after every standings pass. */
export interface ScoredLine extends RoomResult {
  field: string;
  outcome: BoardOutcome;
  /** Matchpoints (MP) or cross-IMPs (Cross-IMP) for each side. */
  nsValue: number;
  ewValue: number;
  /** MP only: the board top the matchpoints are out of. */
  top?: number;
}

/** One Swiss Pairs head-to-head: a full round, or one real half of a group. */
export interface PairsMatchResult {
  field: string;
  section: string;
  round: number;
  ns: string;
  ew: string;
  /** Victory Points (20-VP scale for a round, 10 for a half). */
  nsVp: number;
  ewVp: number;
  /** The table's result on each of the match's boards, in board order. */
  boards: RoomResult[];
}

/** One board of a teams match, from the home team's side. */
export interface TeamMatchBoard {
  boardNumber: number;
  /**
   * Net IMPs (VP and aggregate-IMP teams) or the board result 1 / 0.5 / 0
   * (board-a-match and point-a-board, in native board units); null when the
   * board is not comparable yet.
   */
  home: number | null;
  /** The home team's own table (its NS pair) and the opponent's table. */
  homeRoom: RoomResult | null;
  awayRoom: RoomResult | null;
}

/** One teams match, or one head-to-head comparison of a three-way triple. */
export interface TeamMatchResult {
  field: string;
  section: string;
  round: number;
  /** The triple this comparison belongs to, or null for an ordinary match. */
  triple: "SHORT" | "LONG" | null;
  /** Team ids (each team's home NS seat). */
  home: string;
  opponent: string;
  boards: TeamMatchBoard[];
  /**
   * Each side's match score as the standings credit it: Victory Points (VP
   * teams), net IMPs (aggregate IMPs), or boards won in native board units
   * (board-a-match and point-a-board).
   */
  homeScore: number;
  opponentScore: number;
  /** Boards that counted (comparable in both rooms, or removed). */
  boardsPlayed: number;
  /** Scored as a §3.3.6 / §3.3.9 void match. */
  void: boolean;
}
