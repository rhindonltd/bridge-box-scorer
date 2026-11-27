/**
 * A stored movement's summary row: what the movement picker lists for a table
 * count and what the recommendations match seeded movements against. The same
 * fields as a `pairmovementspec` row in movements.db, without tying callers to
 * the Drizzle schema.
 */
export interface CatalogMovementSummary {
  id: number;
  name: string;
  type: string;
  tables: number;
  boards: number;
  boardsPerRound: number;
  rounds: number;
  missingPair: number | null;
}

/**
 * A stored teams movement's summary row, as the movement picker lists it for a
 * Teams game. `tables` is the team count (one home table per team).
 */
export interface TeamsCatalogMovementSummary {
  id: number;
  name: string;
  tables: number;
  boards: number;
  boardsPerRound: number;
  rounds: number;
}
