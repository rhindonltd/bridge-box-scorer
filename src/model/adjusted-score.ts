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

/** One component of a weighted assigned score: a contract and its weight (%). */
export type WeightedComponent = {
  /** Integer percentage weight (1..100). */
  weight: number;
  /** The contract result this component represents (e.g. `3NTN=`). */
  contract: PlayedContractCode;
};

/* ============================================================
   ARTIFICIAL ADJUSTED SCORES  —  A<ns>/<ew>
============================================================ */

/** Returns true if the outcome is an artificial adjusted score (`A<ns>/<ew>`). */
export function isAdjustedScore(outcome: string): boolean {
  return ADJUSTED_REGEX.test(outcome);
}

/**
 * Parses an artificial adjusted score (e.g. `A60/40`) into NS/EW percentages,
 * or null if the string is not an adjusted score.
 */
export function parseAdjustedScore(
  outcome: string,
): { ns: number; ew: number } | null {
  const match = outcome.match(ADJUSTED_REGEX);
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
 * component; every component is `<integer weight>*<played contract code>`; the
 * weights are each in 1..100; and the weights sum to exactly 100.
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

    // Weight must be a plain non-negative integer (no sign, no decimal).
    if (!/^\d+$/.test(weightStr)) return null;
    const weight = Number(weightStr);
    if (weight < 1 || weight > 100) return null;

    if (!isPlayedContractCode(contract)) return null;

    components.push({ weight, contract });
  }

  const total = components.reduce((sum, c) => sum + c.weight, 0);
  if (total !== 100) return null;

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
  const total = components.reduce((sum, c) => sum + c.weight, 0);
  if (total !== 100) {
    throw new Error(`Weighted score weights must sum to 100 (got ${total})`);
  }
  return "W" + components.map((c) => `${c.weight}*${c.contract}`).join(";");
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
