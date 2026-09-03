import { PairMovementSpec } from "@/db/movements/schema";
import {
  MovementDescriptor,
  descriptorToSelectedMovement,
} from "./movement-descriptor";
import {
  MovementFamily,
  RecommendedMovement,
  movementTypeToFamily,
} from "./recommendation-types";
import specMap from "./recommendation-spec-map.json";

/**
 * The committed recommendation-to-spec snapshot, keyed tables -> boards ->
 * descriptors. This is the single source of which movements are recommended for
 * a given table count (derived from scripts/recommendations.json via the
 * resolver; see recommendation-spec-map.ts).
 */
const SPEC_MAP = specMap as Record<
  string,
  Record<string, MovementDescriptor[]>
>;

/**
 * A skip Mitchell drops its final round, so the rounds a pair actually plays is
 * one fewer than the generated spec's `rounds`. Every other Mitchell family
 * plays all its rounds.
 */
function playedRounds(
  descriptor: Extract<MovementDescriptor, { type: "MITCHELL" }>,
): number {
  return descriptor.subtype === "SKIP"
    ? descriptor.rounds - 1
    : descriptor.rounds;
}

/**
 * Family for a MITCHELL descriptor subtype, so the card can group/label it
 * consistently with the seeded-spec families.
 */
function mitchellFamily(subtype: string): MovementFamily {
  switch (subtype) {
    case "SKIP":
      return "SKIP_MITCHELL";
    case "SHARE_AND_RELAY":
      return "SHARE_AND_RELAY";
    case "WEB":
      return "WEB";
    default:
      return "MITCHELL";
  }
}

/** Human-facing name for a generated Mitchell variant. */
function describeMitchell(
  descriptor: Extract<MovementDescriptor, { type: "MITCHELL" }>,
): string {
  const base = (() => {
    switch (descriptor.subtype) {
      case "SKIP":
        return "Skip Mitchell";
      case "SHARE_AND_RELAY":
        return "Mitchell — Share and Relay";
      case "HESITATION":
        return "Hesitation Mitchell";
      case "WEB":
        return "Web Mitchell";
      default:
        return "Standard Mitchell";
    }
  })();

  // Arrow-switched variants are otherwise identically named; label them so the
  // director can tell two same-subtype cards apart.
  return descriptor.arrowSwitches > 0 ? `${base} (Arrow Switch)` : base;
}

/**
 * Build a RecommendedMovement for a generated (MITCHELL-family) descriptor.
 */
function fromMitchellDescriptor(
  descriptor: Extract<MovementDescriptor, { type: "MITCHELL" }>,
): RecommendedMovement {
  const selected = descriptorToSelectedMovement(descriptor);
  const rounds = playedRounds(descriptor);

  return {
    family: mitchellFamily(descriptor.subtype),
    name: describeMitchell(descriptor),
    rounds,
    boardsPerRound: descriptor.boardsPerRound,
    boardsPerPair: rounds * descriptor.boardsPerRound,
    copies: descriptor.copies,
    pros: descriptor.pros,
    cons: descriptor.cons,
    source: "generated",
    specRef: {
      source: "generated",
      spec:
        selected.source === "MITCHELL"
          ? selected.mitchell
          : {
              tables: descriptor.tables,
              rounds: descriptor.rounds,
              boardsPerRound: descriptor.boardsPerRound,
            },
    },
  };
}

/**
 * Build a RecommendedMovement for a seeded (SPEC) descriptor by resolving its
 * name against the seeded specs available for this table count. Returns null
 * when no seeded spec matches (it cannot be selected without a concrete id).
 */
function fromSpecDescriptor(
  descriptor: Extract<MovementDescriptor, { type: "SPEC" }>,
  specsByName: Map<string, PairMovementSpec>,
): RecommendedMovement | null {
  const spec = specsByName.get(descriptor.name);
  if (!spec) return null;

  return {
    family: movementTypeToFamily(spec.type, spec.name),
    name: spec.name,
    rounds: descriptor.rounds,
    boardsPerRound: descriptor.boardsPerRound,
    boardsPerPair: descriptor.rounds * descriptor.boardsPerRound,
    copies: descriptor.copies,
    pros: descriptor.pros,
    cons: descriptor.cons,
    source: "db",
    specRef: { source: "db", id: spec.id, type: spec.type },
  };
}

/**
 * A stable dedupe key for a descriptor. The same movement can appear under
 * several boards buckets for one table count (e.g. a Web at both 24 and 27
 * boards); we surface each distinct movement once.
 */
function descriptorKey(descriptor: MovementDescriptor): string {
  return descriptor.type === "MITCHELL"
    ? `M:${descriptor.subtype}:${descriptor.arrowSwitches}:${descriptor.rounds}:${descriptor.boardsPerRound}`
    : `S:${descriptor.name}:${descriptor.boardsPerRound}`;
}

/**
 * Resolve the recommended movements for a table count directly from the
 * committed recommendation-spec snapshot.
 *
 * The snapshot is keyed tables -> boards; the movement chooser only knows the
 * table count, so every boards bucket for that table count is flattened,
 * de-duplicated, and ordered by boards-a-pair-plays (descending).
 *
 * Generated (MITCHELL-family) descriptors are self-contained. Seeded (SPEC)
 * descriptors are resolved against `pairSpecs` (the seeded movements for this
 * table count) to recover the id/type needed to select them; a SPEC with no
 * matching seeded spec is dropped.
 */
export function recommendationsFromSpecMap(
  tableCount: number,
  pairSpecs: PairMovementSpec[],
): RecommendedMovement[] {
  const byBoards = SPEC_MAP[String(tableCount)];
  if (!byBoards) return [];

  const specsByName = new Map(pairSpecs.map((s) => [s.name, s]));

  const seen = new Set<string>();
  const movements: RecommendedMovement[] = [];

  for (const descriptors of Object.values(byBoards)) {
    for (const descriptor of descriptors) {
      const key = descriptorKey(descriptor);
      if (seen.has(key)) continue;
      seen.add(key);

      const movement =
        descriptor.type === "MITCHELL"
          ? fromMitchellDescriptor(descriptor)
          : fromSpecDescriptor(descriptor, specsByName);

      if (movement) movements.push(movement);
    }
  }

  movements.sort((a, b) => {
    if (b.boardsPerPair !== a.boardsPerPair) {
      return b.boardsPerPair - a.boardsPerPair;
    }
    return a.name.localeCompare(b.name);
  });

  return movements;
}
