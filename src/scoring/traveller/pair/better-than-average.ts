import { MatchpointLine } from "./mp";
import { ScoredMpBoard } from "./neuberg-across-boards";
import { classifyOutcome } from "./assigned";
import { parseAdjustedScore } from "@/model/adjusted-score";

/**
 * EBU White Book §4.1.1.1 "better than average" override for matchpoint
 * standings.
 *
 * An artificial AVE+ award gives the non-offending pair the GREATER of 60% and
 * its actual average on the OTHER boards in the window; an AVE− award gives the
 * offending pair the LESSER of 40% and its average. So a pair averaging 72% who
 * is given AVE+ keeps 72%, not a flat 60%.
 *
 * This operates PURELY on the standings: it rewrites the matchpoints an
 * AVE+/AVE− board contributes to each pair's TOTAL, computed over the set of
 * boards it is given (the window — a Swiss match's round, or the whole session
 * otherwise). The per-board traveller display is deliberately NOT changed: the
 * board was awarded AVE+/AVE− and still shows `A60/40`, exactly as commercial
 * scoring programs present it; only the pair's ranking reflects the uplift.
 *
 * Scope: matchpoints only, and only the exact AVE+ (`60`) / AVE− (`40`) side
 * values a preset produces. A side with any other percentage is the director's
 * deliberate figure and is left untouched.
 */

/** AVE+ / AVE− percentages. The override applies only to these exact values. */
const AVE_PLUS = 60;
const AVE_MINUS = 40;

/**
 * The windowed average fraction (0–1) each pair earned on its REAL boards in a
 * window: Σ matchpoints / Σ board tops over the boards it actually played
 * (`score !== null`), by participant id. Artificial and assigned boards are
 * excluded — they are not part of "the other boards". A pair with no real
 * boards is absent from the map (→ flat fallback).
 */
function windowedAverages(boards: ScoredMpBoard[]): Map<string, number> {
  const mp = new Map<string, number>();
  const max = new Map<string, number>();

  const add = (id: string, value: number, top: number) => {
    mp.set(id, (mp.get(id) ?? 0) + value);
    max.set(id, (max.get(id) ?? 0) + top);
  };

  for (const board of boards) {
    for (const line of board.lines) {
      // Only REAL played lines count towards a pair's actual average. A line
      // with no outcome (defensive) can't be artificial, so it counts as real
      // when it carries a score.
      if (line.score === null) continue;
      if (line.outcome != null && classifyOutcome(line.outcome) !== "real")
        continue;
      if (line.maxMatchPoints <= 0) continue;
      add(line.nsId, line.nsMatchPoints, line.maxMatchPoints);
      add(line.ewId, line.ewMatchPoints, line.maxMatchPoints);
    }
  }

  const avg = new Map<string, number>();
  for (const [id, top] of max) {
    if (top > 0) avg.set(id, (mp.get(id) ?? 0) / top);
  }
  return avg;
}

/**
 * The matchpoints a side's AVE+ / AVE− award is worth over a board of top
 * `max`, applying the §4.1.1.1 override from that side's windowed average
 * `avg` (0–1), or null when the side's percentage is not an exact AVE+/AVE−
 * (so it is left untouched).
 *
 * - AVE+ (60) → `greater(0.60, avg) × max`.
 * - AVE− (40) → `lesser(0.40, avg) × max`.
 *
 * `avg` undefined (the pair has no real boards in the window) → the flat
 * 60%/40% of `max`.
 */
function overriddenSideMp(
  sidePercent: number,
  avg: number | undefined,
  max: number,
): number | null {
  if (sidePercent === AVE_PLUS) {
    // Clamp the average into [0,1]: a pair's board average cannot exceed the
    // top, and clamping guards against a floating-point overshoot above 100%.
    const clamped = avg === undefined ? 0.6 : Math.min(1, Math.max(0, avg));
    const fraction = Math.max(0.6, clamped);
    return fraction * max;
  }
  if (sidePercent === AVE_MINUS) {
    const clamped = avg === undefined ? 0.4 : Math.min(1, Math.max(0, avg));
    const fraction = Math.min(0.4, clamped);
    return fraction * max;
  }
  return null;
}

/**
 * Apply the §4.1.1.1 "better than average" override to a window of scored MP
 * boards, returning a new array in which each AVE+/AVE− side of an artificial
 * line is re-valued from the pair's windowed average. Non-artificial lines, and
 * artificial sides that are not exactly AVE+/AVE−, are unchanged. A no-op when
 * no artificial AVE+/AVE− line is present.
 *
 * Each side is re-valued INDEPENDENTLY against its own average, so `A60/60`
 * (AVE+/AVE+, outside agency) can legitimately leave `ns + ew > max` — exactly
 * as the flat award already does.
 */
export function applyBetterThanAverage(
  boards: ScoredMpBoard[],
): ScoredMpBoard[] {
  const avg = windowedAverages(boards);

  return boards.map((board) => ({
    board: board.board,
    lines: board.lines.map((line): MatchpointLine => {
      if (line.outcome == null) return line;
      if (classifyOutcome(line.outcome) !== "artificial") return line;
      const pct = parseAdjustedScore(line.outcome);
      if (!pct) return line;

      const nsOverride = overriddenSideMp(
        pct.ns,
        avg.get(line.nsId),
        line.maxMatchPoints,
      );
      const ewOverride = overriddenSideMp(
        pct.ew,
        avg.get(line.ewId),
        line.maxMatchPoints,
      );

      if (nsOverride === null && ewOverride === null) return line;

      return {
        ...line,
        nsMatchPoints: nsOverride ?? line.nsMatchPoints,
        ewMatchPoints: ewOverride ?? line.ewMatchPoints,
      };
    }),
  }));
}
