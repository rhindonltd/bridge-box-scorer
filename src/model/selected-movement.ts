import { z } from "zod";

/**
 * The movement a director has chosen for a game, persisted on the game-index
 * `games` row as opaque JSON text and only materialized into boards/assignments
 * when the game is started.
 *
 * Three variants:
 * - SPEC: a hard-coded movement from the movements database, keyed by numeric id
 *   plus the boards-per-round chosen for it (the stored spec keeps only board-set
 *   indices, so board numbers are computed at materialize time).
 * - MITCHELL: a generated Mitchell movement, described by its spec so it can be
 *   regenerated at start time.
 * - SWISS: a Swiss Pairs movement. Unlike the other two, its schedule is NOT
 *   known up front: only round 1 (a purely positional pairing) is materialized
 *   at start, and each later round is drawn live by the director from current
 *   standings. The selection therefore carries only the setup parameters
 *   (tables, total rounds, boards-per-round); no per-round layout is stored.
 * - SWISS_TEAMS: a Swiss Teams movement. A team is the two pairs seated at one
 *   home table. Like SWISS, its schedule is drawn live: round 1 is a random
 *   team pairing and later rounds are drawn from standings. Each team's NS pair
 *   stays at its home table while its other pair moves to the opponent's home
 *   table (open/closed room), so a match spans two tables playing the same
 *   boards. The selection carries only the setup parameters (team count, total
 *   rounds, boards-per-round); no per-round layout is stored. The team count
 *   must be even (three-way "triangle" handling is not yet supported).
 */

export const mitchellSpecSchema = z.object({
  tables: z.number().int().positive(),
  rounds: z.number().int().positive(),
  boardsPerRound: z.number().int().positive(),
  arrowSwitchRounds: z.number().int().nonnegative().optional(),
  // Mutually-exclusive Mitchell variant flags; at most one should be set. When
  // none is set a Standard Mitchell is regenerated at rehydration.
  skip: z.boolean().optional(),
  shareAndRelay: z.boolean().optional(),
  hesitation: z.boolean().optional(),
  web: z.boolean().optional(),
});

/**
 * Setup parameters for a Swiss Pairs movement. There is no per-round layout:
 * round 1 is positional and later rounds are drawn from standings, so all a
 * Swiss selection needs is the table count, the number of rounds to play, and
 * the boards played per round (which also fixes each round's board range).
 */
export const swissSpecSchema = z.object({
  tables: z.number().int().positive(),
  rounds: z.number().int().positive(),
  boardsPerRound: z.number().int().positive(),
  /**
   * Stable ids of pairs the director has marked as stationary: they keep their
   * round-1 table and direction for the whole event, and each round's drawn
   * opponent comes to them. Pair ids are the Swiss stable numbering — 1..tables
   * are the pairs that start North/South, tables+1..2*tables the pairs that
   * start East/West. Optional and defaults to none.
   */
  stationaryPairs: z.array(z.number().int().positive()).optional(),
});

export type SwissMovementSpec = z.infer<typeof swissSpecSchema>;

/**
 * Setup parameters for a Swiss Teams movement. A team is the two pairs seated
 * at one home table, so `teams` equals the table count. Like Swiss Pairs there
 * is no per-round layout: round 1 is a random draw and later rounds are drawn
 * from standings, so all that is stored is the team count, the number of rounds
 * to play, and the boards played per round (which fixes each round's board
 * range). The team count must be even; odd counts are rejected at start/draw
 * (three-way handling is future work).
 */
export const swissTeamsSpecSchema = z.object({
  teams: z.number().int().positive(),
  rounds: z.number().int().positive(),
  boardsPerRound: z.number().int().positive(),
});

export type SwissTeamsMovementSpec = z.infer<typeof swissTeamsSpecSchema>;

export const selectedMovementSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("SPEC"),
    specId: z.number().int().positive(),
    // Boards played per round when this spec is materialized. Required: the
    // stored spec only carries board-set indices, so board numbers cannot be
    // derived without it.
    boardsPerRound: z.number().int().positive(),
  }),
  z.object({
    source: z.literal("MITCHELL"),
    mitchell: mitchellSpecSchema,
  }),
  z.object({
    source: z.literal("SWISS"),
    swiss: swissSpecSchema,
  }),
  z.object({
    source: z.literal("SWISS_TEAMS"),
    swissTeams: swissTeamsSpecSchema,
  }),
]);

export type SelectedMovement = z.infer<typeof selectedMovementSchema>;

/**
 * Serialize a SelectedMovement to the JSON text stored in the DB column.
 */
export function serializeSelectedMovement(
  selected: SelectedMovement,
): string {
  return JSON.stringify(selected);
}

/**
 * Structural equality for two (possibly null) selected movements. Used to
 * decide whether a movement selection actually changed — e.g. so a no-op
 * re-selection doesn't needlessly clear the section's derived timer.
 *
 * Both are null: equal. One null: not equal. SPEC compares id + boards per
 * round; MITCHELL compares the defining spec fields (and normalises the
 * optional variant flags so an absent flag equals an explicit false).
 */
export function selectedMovementsEqual(
  a: SelectedMovement | null,
  b: SelectedMovement | null,
): boolean {
  if (a === null || b === null) return a === b;
  if (a.source !== b.source) return false;

  if (a.source === "SPEC" && b.source === "SPEC") {
    return a.specId === b.specId && a.boardsPerRound === b.boardsPerRound;
  }

  if (a.source === "MITCHELL" && b.source === "MITCHELL") {
    const x = a.mitchell;
    const y = b.mitchell;
    return (
      x.tables === y.tables &&
      x.rounds === y.rounds &&
      x.boardsPerRound === y.boardsPerRound &&
      (x.arrowSwitchRounds ?? 0) === (y.arrowSwitchRounds ?? 0) &&
      !!x.skip === !!y.skip &&
      !!x.shareAndRelay === !!y.shareAndRelay &&
      !!x.hesitation === !!y.hesitation &&
      !!x.web === !!y.web
    );
  }

  if (a.source === "SWISS" && b.source === "SWISS") {
    return (
      a.swiss.tables === b.swiss.tables &&
      a.swiss.rounds === b.swiss.rounds &&
      a.swiss.boardsPerRound === b.swiss.boardsPerRound
    );
  }

  if (a.source === "SWISS_TEAMS" && b.source === "SWISS_TEAMS") {
    return (
      a.swissTeams.teams === b.swissTeams.teams &&
      a.swissTeams.rounds === b.swissTeams.rounds &&
      a.swissTeams.boardsPerRound === b.swissTeams.boardsPerRound
    );
  }

  return false;
}

/**
 * Parse the DB column value into a typed SelectedMovement. Returns null for
 * null/empty/invalid input so callers always get a well-typed result and a
 * corrupt/legacy value never throws at the boundary.
 */
export function parseSelectedMovement(
  value: string | null | undefined,
): SelectedMovement | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = selectedMovementSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
