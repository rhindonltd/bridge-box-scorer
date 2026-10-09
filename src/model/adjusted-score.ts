import { PlayedContractCode, isPlayedContractCode } from "@/model/result";

/**
 * Director-assigned score encodings.
 *
 * Two kinds of director ruling are stored in the same `director_override_result`
 * column as a normal {@link import("@/model/score").BoardOutcome}, but with their
 * own string shapes so the scorer can recognise and value them specially. Both
 * are *outside* the `BoardOutcome` union (which is only played contracts + the
 * PO/NP specials); they are written with an `as BoardOutcome` cast at the DB
 * boundary and decoded with the predicates here.
 *
 * 1. Artificial adjusted score — `A<ns>/<ew>` (e.g. `A60/40`). A direct
 *    percentage award to each side, independent of any contract. 60/40 means
 *    "NS get 60% of the board, EW get 40%". The sides need not sum to 100
 *    (a 60/60 "average plus to both" split is valid).
 *
 * 2. Weighted assigned score — `W<pct>*<contract>;<pct>*<contract>;…`
 *    (e.g. `W80*3NTN=;20*3NTN+1`). A probability-weighted combination of real
 *    contract results, as awarded under a weighted ruling (Law 12C1c). Each
 *    component is a real {@link PlayedContractCode} that is scored against the
 *    field normally; the line's score is the weighted average of the
 *    components' per-board scores. Weights are integer percentages that sum to
 *    100. A single component (N=1) is a legitimate assigned score (an assigned
 *    result that still scores against the field), distinct from a plain result
 *    correction.
 */

const ADJUSTED_REGEX = /^A(\d+)\/(\d+)$/;

/**
 * Bare average tokens a director (or an importer) might write as shorthand,
 * mapped to the explicit `A<ns>/<ew>` percentages they mean. Without this a
 * literal `AVE` is not a played contract NOR an `A../..` token, so the pairs
 * scorer would treat it as a non-scoring line and silently drop it from the
 * field (EBU audit F6). Normalising here lets every consumer
 * (`isAdjustedScore` / `parseAdjustedScore` / the scorer / USEBIO / the
 * display) value it as the average it names. Case-insensitive; `AVE=` / `AVE+`
 * / `AVE-` accepted. The NS-perspective reading: `AVE+` is AVE+ to NS (60/40).
 */
const BARE_AVERAGE_TOKENS: Readonly<Record<string, string>> = {
  AVE: "A50/50",
  "AVE=": "A50/50",
  "AVE+": "A60/40",
  "AVE-": "A40/60",
};

/**
 * Normalise a bare average token (`AVE` / `AVE+` / `AVE-`, any case) to its
 * `A<ns>/<ew>` form; any other string is returned unchanged. Applied by the
 * adjusted-score predicates so a bare token behaves exactly like the explicit
 * percentage award it is shorthand for.
 */
export function normalizeAdjustedToken(outcome: string): string {
  return BARE_AVERAGE_TOKENS[outcome.toUpperCase()] ?? outcome;
}

/** One component of a weighted assigned score: a contract and its weight (%). */
export type WeightedComponent = {
  /**
   * Percentage weight, 0 < w ≤ 100, with up to 2 decimal places (e.g. `33.33`).
   * The White Book (§4.1.1.4) recommends software support 2dp weightings so a
   * three-way even split (33.33 / 33.33 / 33.34) can be expressed; the weights
   * of a score sum to exactly 100.
   */
  weight: number;
  /** The contract result this component represents (e.g. `3NTN=`). */
  contract: PlayedContractCode;
};

/** A weight is valid when it is > 0, ≤ 100, and has at most 2 decimal places. */
const WEIGHT_REGEX = /^\d+(\.\d{1,2})?$/;

/** Convert a 2dp percentage to integer basis points (×100) so weights sum and
 * compare without binary-float drift (e.g. 33.33 → 3333). Rounds to the nearest
 * basis point to absorb any representation error in the incoming number. */
function toBasisPoints(weight: number): number {
  return Math.round(weight * 100);
}

/** 100% expressed in the basis-point scale {@link toBasisPoints} uses. */
const FULL_WEIGHT_BP = 10_000;

/* ============================================================
   ARTIFICIAL ADJUSTED SCORES  —  A<ns>/<ew>
============================================================ */

/**
 * Returns true if the outcome is an artificial adjusted score — either the
 * explicit `A<ns>/<ew>` form or a bare average token (`AVE` / `AVE+` / `AVE-`).
 */
export function isAdjustedScore(outcome: string): boolean {
  return ADJUSTED_REGEX.test(normalizeAdjustedToken(outcome));
}

/**
 * Parses an artificial adjusted score into NS/EW percentages, or null if the
 * string is not an adjusted score. Accepts both the explicit `A60/40` form and
 * a bare `AVE` / `AVE+` / `AVE-` shorthand (normalised first).
 */
export function parseAdjustedScore(
  outcome: string,
): { ns: number; ew: number } | null {
  const match = normalizeAdjustedToken(outcome).match(ADJUSTED_REGEX);
  if (!match) return null;
  return { ns: Number(match[1]), ew: Number(match[2]) };
}

/** Builds the `A<ns>/<ew>` encoding from NS/EW percentages. */
export function buildAdjustedScore(nsPercent: number, ewPercent: number): string {
  return `A${nsPercent}/${ewPercent}`;
}

/* ============================================================
   WEIGHTED ASSIGNED SCORES  —  W<pct>*<contract>;<pct>*<contract>;…
============================================================ */

/** Fast prefix check: a weighted score always starts with `W`. */
export function isWeightedScore(outcome: string): boolean {
  return parseWeightedScore(outcome) !== null;
}

/**
 * Parses a weighted assigned score (e.g. `W80*3NTN=;20*3NTN+1`) into its
 * components, or null if the string is not a well-formed weighted score.
 *
 * A string is well-formed when: it starts with `W`; it has at least one
 * component; every component is `<weight>*<played contract code>` where the
 * weight is a percentage > 0, ≤ 100, with at most 2 decimal places; and the
 * weights sum to exactly 100 (checked in integer basis points so a 2dp split
 * like 33.33 / 33.33 / 33.34 is accepted without binary-float drift).
 */
export function parseWeightedScore(
  outcome: string,
): WeightedComponent[] | null {
  if (!outcome.startsWith("W") || outcome.length < 2) return null;

  const body = outcome.slice(1);
  const parts = body.split(";");
  const components: WeightedComponent[] = [];

  for (const part of parts) {
    const star = part.indexOf("*");
    if (star <= 0) return null;

    const weightStr = part.slice(0, star);
    const contract = part.slice(star + 1);

    // Weight is a percentage with up to 2 decimal places (no sign).
    if (!WEIGHT_REGEX.test(weightStr)) return null;
    const weight = Number(weightStr);
    if (weight <= 0 || weight > 100) return null;

    if (!isPlayedContractCode(contract)) return null;

    components.push({ weight, contract });
  }

  const totalBp = components.reduce((sum, c) => sum + toBasisPoints(c.weight), 0);
  if (totalBp !== FULL_WEIGHT_BP) return null;

  return components;
}

/**
 * Builds the `W…` encoding from weighted components. Throws if the components
 * are empty or their weights do not sum to 100, so an invalid ruling can never
 * be silently persisted.
 */
export function buildWeightedScore(components: WeightedComponent[]): string {
  if (components.length === 0) {
    throw new Error("A weighted score needs at least one component");
  }
  const totalBp = components.reduce((sum, c) => sum + toBasisPoints(c.weight), 0);
  if (totalBp !== FULL_WEIGHT_BP) {
    const total = totalBp / 100;
    throw new Error(`Weighted score weights must sum to 100 (got ${total})`);
  }
  return "W" + components.map((c) => `${formatWeight(c.weight)}*${c.contract}`).join(";");
}

/**
 * Serialise a weight to at most 2 decimal places with no trailing zeros, so an
 * integer weight stays integer (`80` not `80.00`) and a 2dp weight keeps its
 * places (`33.33`). Keyed off the basis-point value so it matches the parse.
 */
function formatWeight(weight: number): string {
  const bp = toBasisPoints(weight);
  if (bp % 100 === 0) return String(bp / 100);
  if (bp % 10 === 0) return (bp / 100).toFixed(1);
  return (bp / 100).toFixed(2);
}

/* ============================================================
   SHARED
============================================================ */

/**
 * Returns true if the outcome is any kind of director-assigned score
 * (artificial adjusted or weighted assigned) rather than a normally played
 * result. These lines occupy a seat in the field (so they count towards a
 * board's matchpoint maximum) but are valued by the director's ruling rather
 * than by a raw table score.
 */
export function isAssignedOutcome(outcome: string): boolean {
  return isAdjustedScore(outcome) || isWeightedScore(outcome);
}
