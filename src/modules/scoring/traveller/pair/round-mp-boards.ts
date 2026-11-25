import { MatchpointLine } from "./mp";
import { ScoredMpBoard } from "./neuberg-across-boards";

/**
 * EBU White Book §4.2.6.1 per-board matchpoint rounding.
 *
 * The White Book directs that all scoring is computed WITHOUT rounding during
 * the calculation, and only then is a single board's score rounded to the
 * nearest unit of scoring (§2.7), with EXACT HALVES ROUNDED AWAY FROM THE
 * AVERAGE. For matchpoint pairs the unit of scoring is one matchpoint on this
 * codebase's doubled scale (a pair beaten = 2, a tie = 1), and a board's
 * average is half its top, `max / 2`.
 *
 * This pass therefore runs LAST — after per-board scoring (`scoreMP`), after
 * the §4.2.3 cross-board Neuberg / small-sub-field equalisation
 * (`equaliseMpBoards`), and after the §4.1.1.1 "better than average" standings
 * uplift (`applyBetterThanAverage`), all of which must see full precision. The
 * rounded per-board figures are what both the overall ranking sums and the
 * traveller displays, so a published total equals the sum of the shown board
 * scores (the consistency §4.2.6.1 exists to guarantee).
 *
 * Only NS is rounded; EW is kept as `max − roundedNs` so a board's two seats
 * still sum exactly to its top. Because `max = 2*(A-1)` is always even, the
 * average `max / 2` is a whole number and an exact half can never sit exactly
 * on the average, so "away from average" is always unambiguous.
 */

/**
 * Round a matchpoint value to the nearest whole matchpoint, breaking an exact
 * half AWAY FROM the average `avg`. Values above the average round up on a
 * half; values below round down; a value already whole is unchanged.
 */
export function roundHalfAwayFromAverage(value: number, avg: number): number {
  const floor = Math.floor(value);
  const frac = value - floor;

  // Not an exact half: ordinary nearest-integer rounding.
  if (Math.abs(frac - 0.5) > 1e-9) {
    return Math.round(value);
  }

  // Exact half: break away from the average. A half at or above the average
  // rounds up (ceil); a half below the average rounds down (floor). `max/2` is
  // integral, so a `.5` value is never equal to the average itself.
  return value >= avg ? Math.ceil(value) : Math.floor(value);
}

/** Round one board's lines to whole matchpoints, halves away from `max/2`. */
function roundBoard(lines: MatchpointLine[]): MatchpointLine[] {
  return lines.map((line) => {
    const max = line.maxMatchPoints;
    // A neutered single-line board (max 0) has nothing to round.
    if (max <= 0) return line;

    const avg = max / 2;
    const ns = roundHalfAwayFromAverage(line.nsMatchPoints, avg);
    return {
      ...line,
      nsMatchPoints: ns,
      // Keep ns + ew = max so the pooled aggregator stays balanced.
      ewMatchPoints: max - ns,
    };
  });
}

/**
 * Apply §4.2.6.1 per-board rounding to a set of scored MP boards. Returns a new
 * array with each line's matchpoints rounded to the nearest whole matchpoint
 * (exact halves away from the board average). Run this LAST, after Neuberg
 * equalisation and the better-than-average uplift.
 */
export function roundMpBoards(boards: ScoredMpBoard[]): ScoredMpBoard[] {
  return boards.map((b) => ({ board: b.board, lines: roundBoard(b.lines) }));
}
