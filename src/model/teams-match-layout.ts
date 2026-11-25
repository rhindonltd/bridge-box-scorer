/**
 * How a teams match is laid out at the tables. Shared by the Swiss Teams draw
 * and the Teams Round Robin generator, which is why it lives in the kernel and
 * not in either of them.
 *
 * A team is the two pairs seated at one home table. Its home pair (North/South)
 * never moves; its away pair (East/West) travels to face other teams. A match
 * between team A and team B is played in two rooms that share the same boards:
 * the open room at A's home table (A's home pair against B's away pair) and the
 * closed room at B's home table (B's home pair against A's away pair).
 */

/** A team's stable id for the whole event: its home table number (1..teams). */
export type TeamId = number;

/** A single drawn match between two teams for one round. */
export interface TeamsMatch {
  /** The two team ids meeting this round (order is not significant). */
  a: TeamId;
  b: TeamId;
}

/**
 * One pair-seat placement produced by expanding a team match into the two
 * physical tables. `homeTeam` sits at `tableNumber` (its home); the two pairs
 * at that table are `homeTeam`'s home pair (NS) and `awayTeam`'s away pair (EW).
 */
export interface TeamsSeatPlacement {
  tableNumber: number;
  /** The team whose home table this is (its home pair sits NS here). */
  nsTeam: TeamId;
  /** The team whose away pair travels here to sit EW. */
  ewTeam: TeamId;
}

/** The stable team ids for an event of `teams` teams: 1..teams. */
export function teamIds(teams: number): TeamId[] {
  return Array.from({ length: teams }, (_, i) => i + 1);
}

/**
 * Expand a round's team matches into physical pair-seat placements: two tables
 * per match (each team's home table), with the home team's home pair NS and the
 * opponent's away pair EW. Placements are returned in ascending table order.
 *
 * The home table for a team is its stable id (team T is at table T), so the
 * home pair never moves; only away pairs travel to the opponent's home table.
 */
export function expandTeamMatches(matches: TeamsMatch[]): TeamsSeatPlacement[] {
  const placements: TeamsSeatPlacement[] = [];

  for (const match of matches) {
    // Open room at A's home: A home pair (NS) vs B away pair (EW).
    placements.push({ tableNumber: match.a, nsTeam: match.a, ewTeam: match.b });
    // Closed room at B's home: B home pair (NS) vs A away pair (EW).
    placements.push({ tableNumber: match.b, nsTeam: match.b, ewTeam: match.a });
  }

  return placements.sort((x, y) => x.tableNumber - y.tableNumber);
}
