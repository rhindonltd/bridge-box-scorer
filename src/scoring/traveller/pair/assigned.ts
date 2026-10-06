import {
  isAdjustedScore,
  isWeightedScore,
  parseAdjustedScore,
  parseWeightedScore,
} from "@/model/adjusted-score";
import { BoardOutcome } from "@/model/score";
import { outcomeToScore } from "../common";
import { ImpTable } from "../imp-table";

/**
 * Scoring of director-assigned lines (artificial adjusted + weighted assigned)
 * under convention (b): an assigned line occupies a seat in the field, so it
 * counts towards the board's matchpoint maximum, and the real played lines are
 * matchpointed over the full field (with a Neuberg adjustment) rather than over
 * only themselves.
 *
 * See {@link import("@/model/adjusted-score")} for the two encodings.
 */

/** For IMP/XIMP, an assigned score maps to a fixed IMP swing per side. */
const ASSIGNED_IMP_AWARD = 3;

/** Classify a line's outcome. Real played lines score normally. */
export type AssignedKind = "artificial" | "weighted" | "real";

export function classifyOutcome(outcome: string): AssignedKind {
  if (isAdjustedScore(outcome)) return "artificial";
  if (isWeightedScore(outcome)) return "weighted";
  return "real";
}

/* ============================================================
   MATCHPOINTS (MP)
============================================================ */

/**
 * Matchpoint one raw score against a set of other raw scores, on the doubled
 * scale this codebase uses (each pair beaten = 2 MP, each tie = 1 MP). This is
 * the per-line comparison extracted from {@link scoreMP}, reused to value a
 * hypothetical line (a weighted component) against the real field without
 * mutating the field.
 *
 * `others` are the raw scores of the OTHER lines the score is compared against
 * (NS perspective). The returned value is the NS matchpoints over `others`.
 */
export function matchpointsAgainst(score: number, others: number[]): number {
  let mp = 0;
  for (const other of others) {
    if (score > other) mp += 2;
    else if (score === other) mp += 1;
  }
  return mp;
}

/**
 * Neuberg adjustment: scale matchpoints earned over `actual` comparisons up to
 * an expected field of `expected` comparisons. Operates on the doubled scale
 * (top = 2 * comparisons). Returns the adjusted NS matchpoints over `expected`.
 *
 * The standard Neuberg formula on the "per comparison" scale (top = count-1)
 * is `(mp + 1) * E / A - 1`. Here mp is doubled (top = 2*(count-1)), so we
 * halve in, apply, and double out — equivalently `(mp + 1) * E/A - 1` applied
 * to the doubled value with the +1/-1 doubled to +... Keeping it explicit:
 */
export function neuberg(
  doubledMp: number,
  actualComparisons: number,
  expectedComparisons: number,
): number {
  if (actualComparisons <= 0) return 0;
  // Convert to the single scale (top = comparisons), apply Neuberg, double back.
  const single = doubledMp / 2;
  const adjustedSingle =
    (single + 1) * (expectedComparisons / actualComparisons) - 1;
  return adjustedSingle * 2;
}

/* ============================================================
   IMP / CROSS-IMP
============================================================ */

/** Fixed IMP award for an artificial adjusted score, by this side's percentage. */
export function artificialImps(percent: number): number {
  if (percent > 50) return ASSIGNED_IMP_AWARD;
  if (percent < 50) return -ASSIGNED_IMP_AWARD;
  return 0;
}

/** Butler IMPs for a raw score (datum-less), used to value weighted components. */
export function componentImps(score: number): number {
  return ImpTable.calculateImps(score);
}

/** Cross-IMPs for a raw score against a set of other raw scores (averaged). */
export function componentCrossImps(score: number, others: number[]): number {
  if (others.length === 0) return 0;
  const sum = others.reduce(
    (acc, other) => acc + ImpTable.calculateImps(score - other),
    0,
  );
  return sum / others.length;
}

/* ============================================================
   WEIGHTED COMPONENT SCORES
============================================================ */

/**
 * Resolve a weighted assigned outcome into its components' raw scores and
 * weights (as fractions summing to 1). Returns null if the outcome is not a
 * well-formed weighted score. A component whose contract fails to score (should
 * not happen — components are validated played contracts) is dropped.
 */
export function weightedComponentScores(
  board: number,
  outcome: BoardOutcome,
): { weight: number; score: number }[] | null {
  const components = parseWeightedScore(outcome);
  if (!components) return null;

  const resolved: { weight: number; score: number }[] = [];
  for (const c of components) {
    const score = outcomeToScore(board, c.contract);
    /* v8 ignore next -- components are validated PlayedContractCodes, which
       always score to a number; this guard is defensive only. */
    if (score === null) continue;
    resolved.push({ weight: c.weight / 100, score });
  }
  return resolved;
}

/** Read the NS/EW percentages of an artificial adjusted outcome. */
export function artificialPercents(
  outcome: BoardOutcome,
): { ns: number; ew: number } | null {
  return parseAdjustedScore(outcome);
}
