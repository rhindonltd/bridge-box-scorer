import { MovementFamily, movementTypeToFamily } from "./recommendation-types";
import { MovementDescriptor, MitchellSubtype } from "./movement-descriptor";
import { generateMitchell } from "@/movement/mitchell/mitchell";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";

/**
 * A single recommendation as authored in scripts/recommendations.json.
 */
export interface RecommendationEntryInput {
  tables: number;
  boards: number;
  movement: string;
  rounds: number;
  boardsPerRound: number;
  pros: string[];
  cons: string[];
}

/**
 * A seeded pair-movement spec as it exists in the movements database, reduced
 * to the fields the resolver needs. `id` is the database primary key, which —
 * on a fresh seed — equals the 1-based order the movement appears in
 * PSMovements.txt (see src/scripts/seed-movements.ts + createPairMovementSpec's
 * use of lastInsertRowid).
 */
export interface SpecCatalogEntry {
  id: number;
  name: string;
  family: MovementFamily;
  tables: number;
  rounds: number;
}

/**
 * Outcome of resolving one recommendation entry: either one or more concrete,
 * buildable descriptors, or a gap explaining why nothing could be produced.
 */
export type ResolveResult =
  | { resolved: true; descriptors: MovementDescriptor[] }
  | { resolved: false; excluded: true; reason: string }
  | { resolved: false; excluded?: false; reason: string };

/**
 * Movement labels that resolve to a seeded database spec, mapped to the
 * MovementFamily the seeded spec must belong to.
 */
const SPEC_LABEL_FAMILIES: Record<string, MovementFamily> = {
  howell: "HOWELL",
  "3/4 howell": "HOWELL",
  // "web mitchell" is handled explicitly (see resolveRecommendationDescriptor):
  // even tables are generated, odd tables resolve to a seeded WEB spec.
  "appendix mitchell": "APPENDIX",
  "square mitchell": "SQUARE",
  "double weave mitchell": "DOUBLE_WEAVE",
};

/**
 * Movement labels that are not yet producible by any generator or seeded spec.
 * Each is a deliberate follow-up (its own task) where the mechanics are
 * confirmed before a generator or spec is added.
 */
const UNSUPPORTED_LABELS = new Set<string>();

/**
 * Movement labels that are intentionally out of scope for the single-movement
 * mapping. Two reasons:
 * - Twin / Twin Skip are inherently multi-section movements, and sectioning is
 *   handled separately (each section carries its own table count and movement —
 *   see src/db/games/tables/sections.ts).
 * - Beynon Mitchell and Hybrid are excluded by product decision.
 * None of these are gaps to fill.
 */
const EXCLUDED_LABELS = new Set([
  "twin mitchell",
  "twin skip mitchell",
  "beynon mitchell",
  "hybrid",
]);

/** Number of trailing arrow-switched rounds for an Arrow Switch Mitchell. */
const ARROW_SWITCH_ROUNDS = 1;

function normalize(label: string): string {
  return label.trim().toLowerCase();
}

/**
 * Build a SPEC descriptor for a recommendation that maps to a seeded movement.
 *
 * Matching is on family + tables + rounds ONLY — deliberately NOT on the
 * seeded spec's own default boards-per-round. The recommendation's
 * boards-per-round is written into the descriptor and overrides the spec
 * default at rehydration (seeded specs store board-set indices, so any
 * boards-per-round works).
 *
 * When the label carries extra specificity the seeded family cannot express
 * (e.g. "3/4 Howell" vs a full "Howell", both family HOWELL) we prefer a spec
 * whose name reflects that specificity, falling back to any family match.
 */
function resolveSpec(
  entry: RecommendationEntryInput,
  family: MovementFamily,
  catalog: SpecCatalogEntry[],
): ResolveResult {
  const familyMatches = catalog.filter(
    (spec) =>
      spec.family === family &&
      spec.tables === entry.tables &&
      spec.rounds === entry.rounds,
  );

  if (familyMatches.length === 0) {
    return {
      resolved: false,
      reason: `no seeded ${family} spec for ${entry.tables} tables / ${entry.rounds} rounds`,
    };
  }

  // Prefer a spec whose name matches the "3/4" specificity of the label.
  const wantsThreeQuarter = normalize(entry.movement).includes("3/4");
  const preferred =
    familyMatches.find((spec) => {
      const isThreeQuarter = spec.name.toLowerCase().includes("3/4");
      return wantsThreeQuarter ? isThreeQuarter : !isThreeQuarter;
    }) ?? familyMatches[0];

  return {
    resolved: true,
    descriptors: [
      {
        type: "SPEC",
        name: preferred.name,
        rounds: entry.rounds,
        boardsPerRound: entry.boardsPerRound,
        // Seeded Web specs are bridgecentral two-board-set movements; every
        // other seeded family plays a single copy.
        copies: family === "WEB" ? 2 : 1,
        pros: entry.pros,
        cons: entry.cons,
      },
    ],
  };
}

/**
 * Number of physical copies of each board set a generated Mitchell movement
 * needs, read authoritatively from the generator's per-round board-copy labels.
 * An even-table Web uses two copies (A/B); every other Mitchell family is
 * single-copy.
 *
 * Only the Web family uses duplicate copies, so we only build the movement to
 * count them for a Web. Building other families here would be wasteful and, for
 * some curated combinations (e.g. an even-table arrow-switch offered as a
 * share-and-relay at rounds < tables), the generator would reject the spec even
 * though the copy count is trivially one.
 */
function mitchellCopies(spec: MitchellMovementSpec): number {
  if (!spec.web) return 1;

  const generated = generateMitchell(spec);
  const copies = new Set<string>();
  for (const table of generated.tables) {
    for (const round of table.rounds) {
      copies.add(round.boardCopy ?? "A");
    }
  }
  return copies.size;
}

/** Build the MitchellMovementSpec a subtype maps to, for generating/copies. */
function specForSubtype(
  entry: RecommendationEntryInput,
  subtype: MitchellSubtype,
  arrowSwitches: number,
): MitchellMovementSpec {
  return {
    tables: entry.tables,
    rounds: entry.rounds,
    boardsPerRound: entry.boardsPerRound,
    ...(arrowSwitches > 0 ? { arrowSwitchRounds: arrowSwitches } : {}),
    ...(subtype === "SHARE_AND_RELAY" ? { shareAndRelay: true } : {}),
    ...(subtype === "SKIP" ? { skip: true } : {}),
    ...(subtype === "HESITATION" ? { hesitation: true } : {}),
    ...(subtype === "WEB" ? { web: true } : {}),
  };
}

function mitchellDescriptor(
  entry: RecommendationEntryInput,
  subtype: MitchellSubtype,
  arrowSwitches: number,
): MovementDescriptor {
  return {
    type: "MITCHELL",
    subtype,
    tables: entry.tables,
    rounds: entry.rounds,
    boardsPerRound: entry.boardsPerRound,
    arrowSwitches,
    copies: mitchellCopies(specForSubtype(entry, subtype, arrowSwitches)),
    pros: entry.pros,
    cons: entry.cons,
  };
}

/**
 * Pick the Mitchell subtype for a plain Mitchell-family recommendation from the
 * table parity and the rounds/tables relationship:
 * - odd tables            -> STANDARD (a two-winner Mitchell, no skip/relay)
 * - even, rounds == tables -> SHARE_AND_RELAY
 * - even, rounds  < tables -> SKIP
 */
function baseMitchellSubtype(entry: RecommendationEntryInput): MitchellSubtype {
  if (entry.tables % 2 === 1) return "STANDARD";
  return entry.rounds >= entry.tables ? "SHARE_AND_RELAY" : "SKIP";
}

/**
 * Resolve a single recommendation entry to one or more buildable movement
 * descriptors, applying the confirmed mapping rules.
 */
export function resolveRecommendationDescriptor(
  entry: RecommendationEntryInput,
  catalog: SpecCatalogEntry[],
): ResolveResult {
  const label = normalize(entry.movement);

  if (EXCLUDED_LABELS.has(label)) {
    return {
      resolved: false,
      excluded: true,
      reason: `multi-section movement handled by sectioning: ${entry.movement}`,
    };
  }

  if (UNSUPPORTED_LABELS.has(label)) {
    return { resolved: false, reason: `unsupported movement: ${entry.movement}` };
  }

  // Web Mitchell: even-table Webs are produced by the generator (verified to
  // reproduce the seeded [WEB8]/[WEB9] blocks exactly); odd-table Webs use a
  // rover/relay construction the generator does not reproduce, so those stay on
  // the seeded [WEB8R]/[WEB9R] specs.
  if (label === "web mitchell") {
    if (entry.tables % 2 === 0) {
      return {
        resolved: true,
        descriptors: [mitchellDescriptor(entry, "WEB", 0)],
      };
    }
    return resolveSpec(entry, "WEB", catalog);
  }

  // Seeded DB specs.
  const specFamily = SPEC_LABEL_FAMILIES[label];
  if (specFamily) {
    return resolveSpec(entry, specFamily, catalog);
  }

  // Generated Mitchell family.
  switch (label) {
    case "mitchell":
      return {
        resolved: true,
        descriptors: [mitchellDescriptor(entry, baseMitchellSubtype(entry), 0)],
      };

    case "relay mitchell":
      // Relay Mitchell maps to the existing Share and Relay (even tables).
      return {
        resolved: true,
        descriptors: [mitchellDescriptor(entry, "SHARE_AND_RELAY", 0)],
      };

    case "skip mitchell":
      return {
        resolved: true,
        descriptors: [mitchellDescriptor(entry, "SKIP", 0)],
      };

    case "hesitation mitchell":
      return {
        resolved: true,
        descriptors: [mitchellDescriptor(entry, "HESITATION", 0)],
      };

    case "arrow switch mitchell":
      // An arrow-switched Mitchell. For an odd table count a single Standard
      // option; for an even count offer both a share-and-relay and a skip
      // option (per the confirmed ruling).
      if (entry.tables % 2 === 1) {
        return {
          resolved: true,
          descriptors: [
            mitchellDescriptor(entry, "STANDARD", ARROW_SWITCH_ROUNDS),
          ],
        };
      }
      return {
        resolved: true,
        descriptors: [
          mitchellDescriptor(entry, "SHARE_AND_RELAY", ARROW_SWITCH_ROUNDS),
          mitchellDescriptor(entry, "SKIP", ARROW_SWITCH_ROUNDS),
        ],
      };

    default:
      return {
        resolved: false,
        reason: `no mapping rule for movement: ${entry.movement}`,
      };
  }
}

/**
 * Convenience re-export so callers can classify a seeded spec name/type into a
 * family when building a SpecCatalogEntry.
 */
export { movementTypeToFamily };
