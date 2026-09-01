import { z } from "zod";

/**
 * The movement a director has chosen for a game, persisted on the game-index
 * `games` row as opaque JSON text and only materialized into boards/assignments
 * when the game is started.
 *
 * Two variants:
 * - SPEC: a hard-coded movement from the movements database, keyed by numeric id.
 * - MITCHELL: a generated Mitchell movement, described by its spec so it can be
 *   regenerated at start time.
 */

export const mitchellSpecSchema = z.object({
  tables: z.number().int().positive(),
  rounds: z.number().int().positive(),
  boardsPerRound: z.number().int().positive(),
  arrowSwitchRounds: z.number().int().nonnegative().optional(),
  skip: z.boolean().optional(),
  shareAndRelay: z.boolean().optional(),
});

export const selectedMovementSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("SPEC"),
    specId: z.number().int().positive(),
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
