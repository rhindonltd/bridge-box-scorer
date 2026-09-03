import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";

/**
 * A movement "family" groups the concrete movements the system can produce
 * (whether generated client-side or seeded in the DB) into the coarse
 * categories used by the recommendation engine.
 *
 * Recommendations from bridgescoreplus.com are expressed in terms of these
 * families for a given table count. A recommendation is only surfaced when a
 * concrete, available movement matches its family.
 */
export type MovementFamily =
  | "MITCHELL"
  | "SKIP_MITCHELL"
  | "SHARE_AND_RELAY"
  | "SQUARE"
  | "DOUBLE_WEAVE"
  | "HOWELL"
  | "ROVER"
  | "APPENDIX"
  | "WEB"
  | "AMERICAN_WHIST";

/**
 * Reference to the concrete movement a recommendation resolved to. Either a
 * client-generated Mitchell (carrying the spec needed to preview/persist it) or
 * a seeded DB movement spec (carrying its id and persisted type string).
 */
export type RecommendedMovementSpecRef =
  | {
      source: "generated";
      /** Spec passed to generateMitchell / selectMitchellMovement. */
      spec: MitchellMovementSpec;
    }
  | {
      source: "db";
      /** Primary key of the seeded pairmovementspec row. */
      id: number;
      /** Persisted movement type string (numeric MovementType, stringified). */
      type: string;
    };

/**
 * A fully-resolved recommendation ready to render as a selectable card. Built
 * from the committed recommendation-spec snapshot (see
 * spec-map-recommendations.ts), resolving each descriptor to a concrete
 * generated or seeded movement.
 */
export type RecommendedMovement = {
  family: MovementFamily;
  /** Display name (from the concrete movement). */
  name: string;
  rounds: number;
  boardsPerRound: number;
  /** rounds * boardsPerRound, or the entry fallback. Ordering key. */
  boardsPerPair: number;
  /** Physical copies of each board set the director must prepare. */
  copies: number;
  pros: string[];
  cons: string[];
  note?: string;
  source: "generated" | "db";
  specRef: RecommendedMovementSpecRef;
};

/**
 * Numeric MovementType codes as persisted in the pairmovementspec.type column
 * (see src/movement/shared.ts MovementType enum, stringified at seed time).
 */
const MOVEMENT_TYPE_MITCHELL = "0";
const MOVEMENT_TYPE_SWITCHED_MITCHELL = "1";
const MOVEMENT_TYPE_HOWELL = "2";
const MOVEMENT_TYPE_AMERICAN_WHIST = "3";

/**
 * Map a seeded movement's persisted numeric type string and descriptive name to
 * a MovementFamily.
 *
 * Name heuristics take precedence over the coarse numeric type because the
 * seeded Mitchell-family movements (Rover, Appendix, Web) all share the base
 * MITCHELL numeric code but belong to distinct recommendation families.
 */
export function movementTypeToFamily(
  numericType: string,
  name: string,
): MovementFamily {
  const lower = name.toLowerCase();

  // Name-based refinements first (most specific wins).
  if (lower.includes("rover")) return "ROVER";
  if (lower.includes("appendix")) return "APPENDIX";
  if (lower.includes("web")) return "WEB";
  if (lower.includes("square")) return "SQUARE";
  if (lower.includes("weave")) return "DOUBLE_WEAVE";
  if (lower.includes("share") && lower.includes("relay")) {
    return "SHARE_AND_RELAY";
  }
  if (lower.includes("skip")) return "SKIP_MITCHELL";
  if (lower.includes("howell")) return "HOWELL";
  if (lower.includes("american whist") || lower.includes("whist")) {
    return "AMERICAN_WHIST";
  }

  // Fall back to the persisted numeric type.
  switch (numericType) {
    case MOVEMENT_TYPE_HOWELL:
      return "HOWELL";
    case MOVEMENT_TYPE_AMERICAN_WHIST:
      return "AMERICAN_WHIST";
    case MOVEMENT_TYPE_MITCHELL:
    case MOVEMENT_TYPE_SWITCHED_MITCHELL:
    default:
      return "MITCHELL";
  }
}
