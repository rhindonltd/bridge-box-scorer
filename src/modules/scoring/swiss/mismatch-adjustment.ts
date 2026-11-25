import type { MismatchRuling } from "@/model/swiss-mismatch";

/**
 * EBU White Book §3.5.2: the VP adjustment for a director-declared Swiss
 * mismatch. The ruling is stored and parsed by `@/model/swiss-mismatch`.
 */

/**
 * Apply the §3.5.2 VP adjustment to the mismatched side's ACTUAL round VP.
 *
 * `actual` is the VP the side earned from the match as played; `pool` is the VP
 * scale top (20 for a full match, 10 for a half). Only two of the four cases
 * change the value; the result is clamped into `[0, pool]`.
 */
export function adjustMismatchVp(
  actual: number,
  ruling: MismatchRuling,
  pool: number,
): number {
  const { direction, fault } = ruling;

  // The §3.5.2 constant is a QUARTER of the VP pool: 5 on the ordinary 20–0
  // scale, 2.5 on the 10–0 scale of a triangular (triple) comparison, where
  // the not-at-fault adjustment is "2.5 + ¾ × actual". Keying it to the pool
  // keeps both scales correct from one formula.
  const base = pool / 4;

  let adjusted = actual;
  let changed = false;

  if (direction === "HIGHER" && fault === "NOT") {
    // Compensated upward for an undeservedly tougher draw.
    adjusted = base + 0.75 * actual;
    changed = true;
  } else if (direction === "LOWER" && fault === "OWN") {
    // Dock a quarter of any VPs won in excess of the base (never below it from
    // this rule — a side at or under the base keeps its actual score).
    const excess = Math.max(0, actual - base);
    adjusted = actual - 0.25 * excess;
    changed = true;
  }

  // §3.5.2: "all fractions are rounded in the competitor's favour to the next
  // higher minimum unit of scoring" — 0.5 VP on both the 20–0 and the 10–0
  // (triangular) scales. The ×¾ / ×¼ formulas can land on a quarter-VP
  // (e.g. 5 + ¾×7 = 10.25), so round UP to the next 0.5. Only the two cases
  // that change the value are rounded; an untouched `actual` is already a whole
  // VP off the discrete scale, so rounding would be a no-op there anyway.
  if (changed) adjusted = roundUpToHalf(adjusted);

  // HIGHER+OWN and LOWER+NOT leave `actual` unchanged (handled by the default).
  return clamp(adjusted, 0, pool);
}

/** Round UP to the next higher 0.5 unit (the §3.5.2 competitor's-favour unit). */
function roundUpToHalf(value: number): number {
  return Math.ceil(value * 2) / 2;
}

function clamp(value: number, lo: number, hi: number): number {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}
