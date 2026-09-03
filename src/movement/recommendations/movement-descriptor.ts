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
 * - WEB             -> web: true (even-table Web Mitchell; odd tables stay on
 *                      seeded specs)
 */
export const MITCHELL_SUBTYPES = [
  "STANDARD",
  "SHARE_AND_RELAY",
  "SKIP",
  "HESITATION",
  "WEB",
] as const;

export type MitchellSubtype = (typeof MITCHELL_SUBTYPES)[number];

const prosCons = {
  pros: z.array(z.string()),
  cons: z.array(z.string()),
};

export const specDescriptorSchema = z.object({
  type: z.literal("SPEC"),
  /**
   * Name of the seeded pairmovementspec. Together with the recommendation's
   * table count and round count this uniquely identifies a seeded movement
   * (verified: no two seeded specs share a name at the same tables+rounds),
   * and it is stable across re-seeds, unlike the auto-increment row id.
   */
  name: z.string().min(1),
  /**
   * Number of rounds the seeded spec plays. Carried on the descriptor so the
   * snapshot is self-contained (the movement chooser can show rounds and
   * boards-a-pair-plays without loading the seeded spec).
   */
  rounds: z.number().int().positive(),
  /**
   * Boards played per round when this spec is materialized. Sourced from the
   * recommendation entry and overrides the seeded spec's own default.
   */
  boardsPerRound: z.number().int().positive(),
  /**
   * Physical copies of each board set the director must have to hand. Seeded
   * Web specs need two duplicated board sets; every other seeded family is
   * single-copy.
   */
  copies: z.number().int().positive(),
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
  /**
   * Physical copies of each board set the director must have to hand. Derived
   * from the generated movement's distinct board-copy labels: an even-table Web
   * uses two copies (A/B); every other generated Mitchell is single-copy.
   */
  copies: z.number().int().positive(),
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
 *
 * A SPEC descriptor references its seeded movement by name (stable across
 * re-seeds); the persisted selection needs the numeric primary key, so the
 * caller supplies a `resolveSpecId` lookup (name -> id) for the live movements
 * database. It is only required when converting a SPEC descriptor.
 */
export function descriptorToSelectedMovement(
  descriptor: MovementDescriptor,
  resolveSpecId?: (name: string) => number | undefined,
): SelectedMovement {
  if (descriptor.type === "SPEC") {
    const specId = resolveSpecId?.(descriptor.name);
    if (specId === undefined) {
      throw new Error(
        `Cannot resolve a spec id for movement "${descriptor.name}"; ` +
          `pass a resolveSpecId lookup that knows this seeded movement.`,
      );
    }
    return {
      source: "SPEC",
      specId,
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
      ...(subtype === "WEB" ? { web: true } : {}),
    },
  };
}
