import { MatchpointLine } from "./mp";
import { classifyOutcome, neuberg } from "./assigned";

/**
 * EBU White Book §4.2.3 cross-board equalisation for matchpoint pairs.
 *
 * `scoreMP` matchpoints each board over its OWN realised field — a board with
 * `A` lines gets a top of `2*(A-1)`. When boards in the same event are played a
 * different number of times (a half-table, a sit-out board, a board fouled or
 * only playable at some tables), the short boards must be scaled up so every
 * board is worth the same across the field (§4.2.5.1). This module performs
 * that scaling AFTER per-board scoring, operating on the already-scored
 * {@link MatchpointLine}s so the per-board scorer stays session-agnostic.
 *
 * Two methods, per the White Book:
 *
 * - **Neuberg (§4.2.3.2)** — used when `A > 3` or `A > E/3`. A line's
 *   matchpoints `M` (single scale, top `A-1`) become `((M+1)/A)·E − 1`
 *   (single scale, top `E-1`). Here matchpoints are on the doubled scale this
 *   codebase uses, so {@link neuberg} applies the same formula via the `E/A`
 *   ratio. The board's top is lifted to `2*(E-1)` so it carries full weight in
 *   the pooled `Σvalue / Σmax` ranking.
 *
 * - **Small sub-fields (§4.2.3.3)** — used when `A = 2` or `A = 3` AND the
 *   group is at most a third of the field (`A ≤ E/3`). The result is awarded a
 *   fixed percentage of the (full-field) top rather than Neuberg: a group of 2
 *   → top 65% / bottom 55%; a group of 3 → top 70% / 60% / 50%. Equivalently,
 *   with `m` the line's matchpoints on the SINGLE scale (0..A−1, ties
 *   fractional), `Percentage = 60% + (m − (A − 1)/2) × 10%`. (The White Book
 *   prints this as `60% + (M − (A − 1)) × 5%`, which is the same expression
 *   with `M = 2m`, i.e. matchpoints on the doubled scale.) Intermediate and
 *   tied results sit between the endpoints.
 *
 * where:
 * - **E** = expected results on a normal board = the maximum line count of any
 *   board in the pooled field,
 * - **A** = actual results on this board = its line count,
 * - **M** = the line's matchpoints considering only its own group.
 *
 * A board whose `A === E` (a fully-played board) is returned unchanged. The
 * invariant `nsMatchPoints + ewMatchPoints === maxMatchPoints` is preserved so
 * the overall aggregator (which adds the same `max` for both seats and ranks on
 * `totalMP / maxMP`) stays correct.
 */

/** A single board's scored MP lines, tagged with its board number. */
export interface ScoredMpBoard {
  board: number;
  lines: MatchpointLine[];
}

/**
 * The realised field size `A` of a scored MP board: the number of lines that
 * participate in the field. Every line a board emits (real played, artificial
 * adjusted, weighted assigned) occupies a seat and shares the same
 * `maxMatchPoints = 2*(A-1)`, so `A` is recovered as `max/2 + 1`. A neutered
 * single-line board (`max === 0`) has `A = 1` and never scales.
 */
function fieldSize(lines: MatchpointLine[]): number {
  if (lines.length === 0) return 0;
  const max = lines[0].maxMatchPoints;
  // max = 2*(A-1) ⇒ A = max/2 + 1. Guard the neutered (max 0, single line) case.
  return max > 0 ? max / 2 + 1 : lines.length;
}

/** Expected field size `E` = the largest realised field across the boards. */
export function expectedFieldSize(boards: ScoredMpBoard[]): number {
  let e = 0;
  for (const b of boards) {
    const a = fieldSize(b.lines);
    if (a > e) e = a;
  }
  return e;
}

/**
 * The small-sub-field (§4.2.3.3) award for a line, as a fraction of the top.
 * `singleMp` is the line's matchpoints on the single scale (0..A−1, ties
 * fractional). `Percentage = 60% + (singleMp − (A − 1)/2) × 10%` yields 55/65
 * for a group of 2 and 50/60/70 for a group of 3 as the matchpoints run
 * 0..(A−1), with ties landing midway.
 */
function smallSubFieldFraction(singleMp: number, a: number): number {
  const percent = 60 + (singleMp - (a - 1) / 2) * 10;
  return percent / 100;
}

/** Rescale one board's lines to the common full-field top `2*(E-1)`. */
function rescaleBoard(lines: MatchpointLine[], e: number): MatchpointLine[] {
  const a = fieldSize(lines);

  // Fully-played board, a degenerate field, or a neutered single-line board:
  // nothing to equalise.
  if (a >= e || a <= 1 || e <= 1) return lines;

  const fullTop = 2 * (e - 1);
  const oldTop = 2 * (a - 1);

  // §4.2.3.3 small sub-field: A ∈ {2,3} and the group is at most a third of the
  // field. Otherwise Neuberg (§4.2.3.2).
  const useSmallSubField = (a === 2 || a === 3) && a * 3 <= e;

  return lines.map((line) => {
    // Director-assigned lines (artificial `A<ns>/<ew>` and weighted `W…`)
    // already express a chosen share of the board top; cross-board scaling
    // must preserve that share, not re-matchpoint it. Only REAL played lines
    // get Neuberg / small-sub-field treatment.
    const isReal = classifyOutcome(line.outcome) === "real";

    let ns: number;
    if (!isReal) {
      // Preserve the line's percentage of the (now larger) full-field top.
      ns = oldTop > 0 ? (line.nsMatchPoints / oldTop) * fullTop : fullTop / 2;
    } else if (useSmallSubField) {
      ns = smallSubFieldFraction(line.nsMatchPoints / 2, a) * fullTop;
    } else {
      ns = neuberg(line.nsMatchPoints, a, e);
    }

    return {
      ...line,
      maxMatchPoints: fullTop,
      nsMatchPoints: ns,
      // Preserve ns + ew = max so the pooled aggregator stays balanced.
      ewMatchPoints: fullTop - ns,
    };
  });
}

/**
 * Apply §4.2.3 cross-board equalisation to a set of scored MP boards. Returns a
 * new array of boards with each short board scaled up to the common full-field
 * top; fully-played boards are returned unchanged. When every board is the same
 * size (the common even-movement case) this is a no-op.
 */
export function equaliseMpBoards(boards: ScoredMpBoard[]): ScoredMpBoard[] {
  const e = expectedFieldSize(boards);
  if (e <= 1) return boards;
  return boards.map((b) => ({ board: b.board, lines: rescaleBoard(b.lines, e) }));
}
