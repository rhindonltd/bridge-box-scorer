import { z } from "zod";

/**
 * The movement a director has chosen for a game, persisted on the game-index
 * `games` row as opaque JSON text and only materialized into boards/assignments
 * when the game is started.
 *
 * Two variants:
 * - SPEC: a hard-coded movement from the movements database, keyed by numeric id
 *   plus the boards-per-round chosen for it (the stored spec keeps only board-set
 *   indices, so board numbers are computed at materialize time).
 * - MITCHELL: a generated Mitchell movement, described by its spec so it can be
 *   regenerated at start time.
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
