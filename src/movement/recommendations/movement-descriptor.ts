import { z } from "zod";
import { SelectedMovement } from "@/model/selected-movement";

/**
 * A movement-spec descriptor: the resolved, buildable movement a curated
 * recommendation maps to. This is the artifact shape authored in the
 * recommendation-to-spec map (see recommendation-spec-map.ts) and is a richer
 * superset of the persisted {@link SelectedMovement} (it additionally carries
 * the human-facing pros/cons and, for generated movements, a descriptive
 * `subtype`).
 *
 * Two shapes:
 * - SPEC: a seeded database movement, referenced by its numeric id. The
 *   `boardsPerRound` is taken from the recommendation (NOT the seeded spec's
 *   own default) and overrides it at materialize time — seeded specs store
 *   board-set indices, so any boards-per-round works.
 * - MITCHELL: a client-generated Mitchell-family movement, described by the
 *   spec needed to regenerate it plus a `subtype` naming the variant.
 */

/**
 * The Mitchell variant a MITCHELL descriptor selects. Maps 1:1 onto the
 * discriminant flags carried by {@link MitchellMovementSpec} / the persisted
 * mitchell spec:
 * - STANDARD        -> no flag (plain Mitchell)
 * - SHARE_AND_RELAY -> shareAndRelay: true
 * - SKIP            -> skip: true
 * - HESITATION      -> hesitation: true (rounds computed as tables + 1)
 */
export const MITCHELL_SUBTYPES = [
  "STANDARD",
  "SHARE_AND_RELAY",
  "SKIP",
  "HESITATION",
] as const;

export type MitchellSubtype = (typeof MITCHELL_SUBTYPES)[number];

const prosCons = {
  pros: z.array(z.string()),
  cons: z.array(z.string()),
};

export const specDescriptorSchema = z.object({
  type: z.literal("SPEC"),
  /** Primary key of the seeded pairmovementspec row. */
  id: z.number().int().positive(),
  /**
   * Boards played per round when this spec is materialized. Sourced from the
   * recommendation entry and overrides the seeded spec's own default.
   */
  boardsPerRound: z.number().int().positive(),
  ...prosCons,
});

export type SpecDescriptor = z.infer<typeof specDescriptorSchema>;

export const mitchellDescriptorSchema = z.object({
  type: z.literal("MITCHELL"),
  subtype: z.enum(MITCHELL_SUBTYPES),
  tables: z.number().int().positive(),
  rounds: z.number().int().positive(),
  boardsPerRound: z.number().int().positive(),
  /**
   * Number of trailing rounds that are arrow-switched (0 = a two-winner
   * movement with no switch). Defaults to 0 when omitted.
   */
  arrowSwitches: z.number().int().nonnegative().default(0),
  ...prosCons,
});

export type MitchellDescriptor = z.infer<typeof mitchellDescriptorSchema>;

export const movementDescriptorSchema = z.discriminatedUnion("type", [
  specDescriptorSchema,
  mitchellDescriptorSchema,
]);

export type MovementDescriptor = z.infer<typeof movementDescriptorSchema>;

/**
 * Convert a resolved descriptor into the persisted {@link SelectedMovement}
 * tagged union that is stored on `game.sections.selectedMovement` and
 * rehydrated at game start. The pros/cons and (for Mitchell) the descriptive
 * `subtype` are display metadata and are dropped here.
 */
export function descriptorToSelectedMovement(
  descriptor: MovementDescriptor,
): SelectedMovement {
  if (descriptor.type === "SPEC") {
    return {
      source: "SPEC",
      specId: descriptor.id,
      boardsPerRound: descriptor.boardsPerRound,
    };
  }

  const { tables, rounds, boardsPerRound, arrowSwitches, subtype } = descriptor;

  return {
    source: "MITCHELL",
    mitchell: {
      tables,
      rounds,
      boardsPerRound,
      ...(arrowSwitches > 0 ? { arrowSwitchRounds: arrowSwitches } : {}),
      ...(subtype === "SHARE_AND_RELAY" ? { shareAndRelay: true } : {}),
      ...(subtype === "SKIP" ? { skip: true } : {}),
      ...(subtype === "HESITATION" ? { hesitation: true } : {}),
    },
  };
}
