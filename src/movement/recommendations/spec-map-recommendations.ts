import { PairMovementSpec } from "@/db/movements/schema";
import { generateMitchell } from "@/movement/mitchell/mitchell";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";
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
  /* v8 ignore next 8 -- the `: {...}` fallback is unreachable: a MITCHELL descriptor always maps to a source==="MITCHELL" selected movement */
  const mitchellSpec =
    selected.source === "MITCHELL"
      ? selected.mitchell
      : {
          tables: descriptor.tables,
          rounds: descriptor.rounds,
          boardsPerRound: descriptor.boardsPerRound,
        };

  return {
    family: mitchellFamily(descriptor.subtype),
    name: describeMitchell(descriptor),
    rounds,
    boardsPerRound: descriptor.boardsPerRound,
    boardsPerPair: rounds * descriptor.boardsPerRound,
    boardsInPlay: highestBoardNumber(mitchellSpec),
    copies: descriptor.copies,
    pros: descriptor.pros,
    cons: descriptor.cons,
    source: "generated",
    specRef: { source: "generated", spec: mitchellSpec },
  };
}

/**
 * The highest board number a generated Mitchell puts in play. Generate the
 * movement and take the max board across all tables/rounds: relay and web
 * variants circulate fewer distinct boards than rounds * boardsPerRound.
 */
function highestBoardNumber(spec: MitchellMovementSpec): number {
  let highest = 0;
  for (const table of generateMitchell(spec).tables) {
    for (const round of table.rounds) {
      for (const board of round.boards) {
        if (board > highest) highest = board;
      }
    }
  }
  return highest;
}

/**
 * Key a seeded spec by (name, rounds). Within a single table count this is
 * unique, whereas name alone is not: e.g. "[M109] Double Howell" is seeded at 8
 * tables with both 7 and 8 rounds, so a name-only lookup would collide.
 */
function specKey(name: string, rounds: number): string {
  return `${name}\u0000${rounds}`;
}

/**
 * Build a RecommendedMovement for a seeded (SPEC) descriptor by resolving its
 * (name, rounds) against the seeded specs available for this table count.
 * Returns null when no seeded spec matches (it cannot be selected without a
 * concrete id).
 */
function fromSpecDescriptor(
  descriptor: Extract<MovementDescriptor, { type: "SPEC" }>,
  specsByKey: Map<string, PairMovementSpec>,
): RecommendedMovement | null {
  const spec = specsByKey.get(specKey(descriptor.name, descriptor.rounds));
  if (!spec) return null;

  return {
    family: movementTypeToFamily(spec.type, spec.name),
    name: spec.name,
    rounds: descriptor.rounds,
    boardsPerRound: descriptor.boardsPerRound,
    boardsPerPair: descriptor.rounds * descriptor.boardsPerRound,
    // The seeded spec stores board-set indices; the highest board number in
    // play scales with the recommendation's boards-per-round. The spec's own
    // `boards` is at its default boards-per-round, so derive from the set count.
    boardsInPlay: (spec.boards / spec.boardsPerRound) * descriptor.boardsPerRound,
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

  const specsByKey = new Map(
    pairSpecs.map((s) => [specKey(s.name, s.rounds), s]),
  );

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
          : fromSpecDescriptor(descriptor, specsByKey);

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
