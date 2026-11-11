/**
 * A pair's personal scorecard: every board it has played so far, each scored
 * the same way as the player's Board Results screen (the board's raw per-board
 * score — no leaderboard-only adjustments such as Neuberg equalisation or the
 * "better than average" uplift), plus — for a Swiss Pairs event — the Victory
 * Points it earned in each round.
 *
 * Framework-free so the server (which computes it) and the client (which
 * renders it) share one shape.
 */

/** Which per-board score the scorecard carries (the game's per-board scoring). */
export type ScorecardScoring = "MP" | "IMP" | "XIMP";

export interface ScorecardBoard {
  roundNumber: number;
  boardNumber: number;
  /** Which side this pair sat on the board (can change between rounds). */
  side: "NS" | "EW";
  /** The opponents' pair id (as recorded on the board). */
  opponentId: string;
  /**
   * The board's outcome: a played contract code, "NP" (not played), "PO"
   * (passed out), or an adjusted score such as "A60/40".
   */
  outcome: string;
  /**
   * The raw score from THIS pair's point of view (positive = this pair scored
   * the points), or null when there is no raw score (not played / adjusted).
   */
  score: number | null;
  /** MP scoring: this pair's matchpoints and the board top. */
  matchpoints?: { value: number; max: number };
  /** IMP scoring: this pair's IMPs on the board. */
  imps?: number;
  /** Cross-IMP scoring: this pair's cross-IMPs on the board. */
  crossImps?: number;
}

export interface ScorecardRoundVp {
  roundNumber: number;
  /** The opponents' pair id for the round, when known. */
  opponentId: string | null;
  vp: number;
}

export interface PairScorecard {
  /** This pair's id as recorded on the boards (and on the leaderboard). */
  pairId: string;
  scoring: ScorecardScoring;
  /** Boards with a result for this pair, in round then board order. */
  boards: ScorecardBoard[];
  /**
   * Swiss Pairs only: the Victory Points this pair earned in each round, in
   * round order. Null for every other event.
   */
  roundVps: ScorecardRoundVp[] | null;
}
