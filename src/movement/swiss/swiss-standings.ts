/**
 * One competitor's current standing, surfaced on a Swiss draw preview so the
 * director can see the field in the order the draw ranked it (best first) with
 * each competitor's running total.
 *
 * Framework-free and shared by both the Swiss Pairs and Swiss Teams preview
 * payloads (server) and their client acks, so the same shape crosses the wire.
 * `total` is the raw Victory-Points total the leaderboard ranks on — format it
 * to 2 dp for display to match the leaderboard exactly.
 */
export interface SwissStandingEntry {
  /** Stable competitor id: a Swiss pair id (pairs) or team id (teams). */
  id: number;
  /** Resolved display label — pair names or team name. */
  name: string;
  /** Running Victory-Points total (raw; show with `.toFixed(2)`). */
  total: number;
  /** Rank in the current standings (shared by tied competitors). */
  rank: number;
  /** True when this competitor is tied with another on the same total. */
  tied: boolean;
}
