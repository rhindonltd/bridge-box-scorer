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
 * mismatch, and this module stores and reads that ruling. The §3.5.2 VP
 * adjustment itself is scoring (`scoring/swiss/mismatch-adjustment.ts`).
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
 * mismatched side's round VP is recomputed. Per §3.5.2 the adjusted VP is then
 * rounded UP to the next 0.5 VP ("in the competitor's favour"), since the ¾/¼
 * formulas can land on a quarter-VP.
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

/**
 * Separates the two sides' rulings when BOTH sides of one match are ruled
 * mismatched (each was drawn against the wrong opponents), e.g.
 * `MM:NS:HIGHER:NOT;MM:EW:LOWER:OWN`. A match holds at most one ruling per side.
 */
const SIDE_SEPARATOR = ";";

/** Build the stored token for a mismatch ruling, e.g. `MM:NS:HIGHER:NOT`. */
export function buildMismatch(ruling: MismatchRuling): string {
  return `${PREFIX}${ruling.side}:${ruling.direction}:${ruling.fault}`;
}

/** True if the outcome string carries at least one mismatch ruling. */
export function isMismatch(outcome: string): boolean {
  return parseMismatches(outcome).length > 0;
}

/**
 * Every mismatch ruling a stored match ruling carries — one per ruled side,
 * NS first — or an empty list when it isn't a mismatch ruling (e.g. a void).
 * A malformed part makes the whole value unrecognised (empty list).
 */
export function parseMismatches(ruling: string): MismatchRuling[] {
  const parts = ruling.split(SIDE_SEPARATOR);
  const parsed: MismatchRuling[] = [];
  for (const part of parts) {
    const one = parseMismatch(part);
    if (one == null) return [];
    parsed.push(one);
  }
  // At most one ruling per side.
  if (new Set(parsed.map((r) => r.side)).size !== parsed.length) return [];
  return parsed.sort((a, b) => SIDES.indexOf(a.side) - SIDES.indexOf(b.side));
}

/**
 * The stored match ruling after ruling one more side mismatched. A ruling the
 * match already holds for the OTHER side is kept (both pairs/teams of a match
 * can be mismatched); one for the SAME side is replaced. Anything else the
 * match held (no ruling, or a non-mismatch ruling) gives way to this one.
 */
export function withMismatch(
  existing: string | null,
  ruling: MismatchRuling,
): string {
  const kept =
    existing == null
      ? []
      : parseMismatches(existing).filter((r) => r.side !== ruling.side);
  return [...kept, ruling]
    .sort((a, b) => SIDES.indexOf(a.side) - SIDES.indexOf(b.side))
    .map(buildMismatch)
    .join(SIDE_SEPARATOR);
}

/** Parse ONE side's mismatch token into its ruling, or null if malformed. */
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
 * The same single-side mismatch token seen from the other room: its `side`
 * flips (NS ↔ EW). A token that is not `MM:<side>:<direction>:<fault>` is
 * returned as is. Used to store a ruling made from the opponents' room
 * home-relative.
 */
export function invertMismatchSide(token: string): string {
  const parts = token.split(":");
  if (parts.length !== 4 || `${parts[0]}:` !== PREFIX) return token;
  parts[1] = parts[1] === "NS" ? "EW" : "NS";
  return parts.join(":");
}
