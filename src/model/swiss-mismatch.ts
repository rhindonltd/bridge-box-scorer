/**
 * Swiss MISMATCH VP adjustment — EBU White Book §3.5 / §3.5.2.
 *
 * A mismatch occurs when a contestant is drawn against the WRONG opponents and
 * the current score of the actual opponents differs from the correct opponents'
 * by more than 5 VP (on the 20–0 scale). Detecting a mismatch requires knowing
 * who the "correct" opponents would have been — draw intent this app does not
 * retain once a round has been drawn or hand-edited — and the special case
 * (several valid alternatives, >5 for only some) plus the fault attribution are
 * director judgements. So detection is a NON-GOAL here: the director DECLARES a
 * mismatch, and this module supplies the mechanical §3.5.2 VP adjustment.
 *
 * The adjustment is ONE-SIDED. In a mismatched match typically one side is
 * mismatched and the other is not; only the mismatched side's VP is touched,
 * and only in two of the four cases:
 *
 * The adjustment constant is a QUARTER of the VP pool (`pool/4`): 5 on the
 * ordinary 20–0 scale, 2.5 on the 10–0 scale of a triangular (triple)
 * comparison. The cases, with `base = pool/4`:
 *
 * - vs a HIGHER-scoring opponent than the correct one:
 *   - NOT the side's fault → `base + ¾ × actual` (compensated upward);
 *   - the side's OWN fault → `actual` (unchanged — no reward for a self-caused
 *     tougher draw).
 * - vs a LOWER-scoring opponent than the correct one:
 *   - the side's OWN fault → `actual − ¼ × (actual − base)` (the VPs won in
 *     excess of `base` are docked by a quarter);
 *   - NOT the side's fault → `actual` (unchanged — not penalised for an easier
 *     draw that wasn't their doing).
 *
 * The opponent's VP is NEVER changed by this ruling. The result of the match
 * itself stands (the boards are real and remain in the field); only the
 * mismatched side's round VP is recomputed.
 *
 * Worked examples from the White Book:
 *   20–0 scale, higher + not-fault, win 12–8 → 5 + ¾×12 = 14
 *   20–0 scale, lower + own-fault,  win 13–7 → 13 − (13−5)/4 = 11
 *   10–0 scale (triangular), higher + not-fault → 2.5 + ¾ × actual
 */

const PREFIX = "MM:";

/** Which seat of the acted match is the mismatched side (home-relative). */
export type MismatchSide = "NS" | "EW";

/** Whether the actual opponent out-scored (HIGHER) or trailed (LOWER) the
 * correct opponent. */
export type MismatchDirection = "HIGHER" | "LOWER";

/** Whether the mismatch was the mismatched side's OWN fault, or NOT. */
export type MismatchFault = "OWN" | "NOT";

/**
 * A declared mismatch ruling, expressed relative to the acted row's seats
 * (NS = this table / home team; EW = the opponents). It names the mismatched
 * `side`, the `direction` of the actual opponent versus the correct one, and
 * whose `fault` it was. The opponent side is never the subject of the ruling.
 */
export interface MismatchRuling {
  side: MismatchSide;
  direction: MismatchDirection;
  fault: MismatchFault;
}

const SIDES: readonly MismatchSide[] = ["NS", "EW"];
const DIRECTIONS: readonly MismatchDirection[] = ["HIGHER", "LOWER"];
const FAULTS: readonly MismatchFault[] = ["OWN", "NOT"];

/** Build the stored token for a mismatch ruling, e.g. `MM:NS:HIGHER:NOT`. */
export function buildMismatch(ruling: MismatchRuling): string {
  return `${PREFIX}${ruling.side}:${ruling.direction}:${ruling.fault}`;
}

/** True if the outcome string is a mismatch token. */
export function isMismatch(outcome: string): boolean {
  return parseMismatch(outcome) !== null;
}

/** Parse a mismatch token into its ruling, or null if not a well-formed one. */
export function parseMismatch(outcome: string): MismatchRuling | null {
  if (!outcome.startsWith(PREFIX)) return null;
  const parts = outcome.slice(PREFIX.length).split(":");
  if (parts.length !== 3) return null;
  const [side, direction, fault] = parts as [
    MismatchSide,
    MismatchDirection,
    MismatchFault,
  ];
  if (
    !SIDES.includes(side) ||
    !DIRECTIONS.includes(direction) ||
    !FAULTS.includes(fault)
  ) {
    return null;
  }
  return { side, direction, fault };
}

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

  if (direction === "HIGHER" && fault === "NOT") {
    // Compensated upward for an undeservedly tougher draw.
    adjusted = base + 0.75 * actual;
  } else if (direction === "LOWER" && fault === "OWN") {
    // Dock a quarter of any VPs won in excess of the base (never below it from
    // this rule — a side at or under the base keeps its actual score).
    const excess = Math.max(0, actual - base);
    adjusted = actual - 0.25 * excess;
  }

  // HIGHER+OWN and LOWER+NOT leave `actual` unchanged (handled by the default).
  return clamp(adjusted, 0, pool);
}

function clamp(value: number, lo: number, hi: number): number {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}
