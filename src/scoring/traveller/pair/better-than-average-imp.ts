import { ImpLine } from "./imp";
import { XimpLine } from "./x-imp";
import { classifyOutcome } from "./assigned";
import { parseAdjustedScore } from "@/model/adjusted-score";

/**
 * EBU White Book §4.1.1.1 "better than average" override for IMP and Cross-IMP
 * pairs standings — the IMP analogue of
 * {@link import("./better-than-average").applyBetterThanAverage}.
 *
 * An artificial AVE+ award gives the non-offending pair the GREATER of the flat
 * +3 IMPs and its actual average IMP on the OTHER boards in the window; an AVE−
 * award gives the offending pair the LESSER of −3 and its average. So a pair
 * averaging +5 IMPs who is given AVE+ keeps +5, not a flat +3 (the White Book
 * example: a pair averaging +4 gets +4 for AVE+, a pair averaging −4 gets −4
 * for AVE−).
 *
 * Like the matchpoint version this operates PURELY on the standings: it rewrites
 * the IMPs an AVE+/AVE− board contributes to each pair's TOTAL, computed over
 * the window of boards it is given (a session, or a Swiss match's round). The
 * per-board traveller display is deliberately NOT changed — the board was
 * awarded a flat ±3 and still shows that; only the pair's ranking reflects the
 * uplift.
 *
 * Scope: only the exact ±3 artificial award a preset produces (`artificialImps`:
 * a side's percentage > 50 → +3, < 50 → −3, = 50 → 0). The 0 (AVE) side is
 * never uplifted, and a real or weighted line is left untouched (its score is a
 * genuine or director-chosen figure).
 *
 * Shared by both the IMP (`nsImps`/`ewImps`) and Cross-IMP
 * (`nsCrossImps`/`ewCrossImps`) line shapes via the generic `getNs`/`getEw`/
 * `withSides` accessors below, so the two per-board algorithms reuse one rule.
 *
 * Note on datum-less IMP: the Butler (`scoreIMP`) scale floors each side at 0
 * (a pair's own result is IMPed against zero, and the losing side is clamped to
 * 0), so a pair's windowed average on that scale is never negative. The AVE−
 * downlift (`min(−3, avg)`) therefore only ever bites on the signed Cross-IMP
 * scale; on datum-less IMP an AVE− award stays at the flat −3. The AVE+ uplift
 * works on both.
 */

/** The flat ±3 IMP award an artificial AVE+/AVE− produces (mirrors `assigned.ts`). */
const AVE_PLUS_IMPS = 3;
const AVE_MINUS_IMPS = -3;

/** One scored board of IMP or Cross-IMP lines, tagged with its board number. */
export interface ScoredImpBoard<L> {
  board: number;
  lines: L[];
}

/**
 * How to read and rewrite a line's two sides' IMP values, so the one override
 * works for both the IMP (`nsImps`/`ewImps`) and Cross-IMP
 * (`nsCrossImps`/`ewCrossImps`) shapes.
 */
interface SideAccess<L> {
  getNs: (line: L) => number;
  getEw: (line: L) => number;
  withSides: (line: L, ns: number, ew: number) => L;
}

/**
 * The windowed average IMP each pair earned on its REAL boards in a window:
 * Σ IMPs / count over the boards it actually played (a real played line), by
 * participant id. Artificial and weighted lines are excluded — they are not
 * part of "the other boards". A pair with no real boards is absent from the map
 * (→ flat ±3 fallback).
 */
function windowedAverageImps<L extends { outcome?: unknown; score?: number | null }>(
  boards: ScoredImpBoard<L>[],
  access: SideAccess<L>,
  idOf: (line: L) => { ns: string; ew: string },
): Map<string, number> {
  const sum = new Map<string, number>();
  const count = new Map<string, number>();

  const add = (id: string, value: number) => {
    sum.set(id, (sum.get(id) ?? 0) + value);
    count.set(id, (count.get(id) ?? 0) + 1);
  };

  for (const board of boards) {
    for (const line of board.lines) {
      // Only REAL played lines count towards a pair's actual average. A line
      // with no raw score (a synthetic sit-out / withdrawal / handover credit,
      // or an artificial award) is not "another board the pair played", so it
      // is excluded — mirroring the matchpoint `windowedAverages`.
      if (line.score == null) continue;
      const outcome = line.outcome;
      if (typeof outcome === "string" && classifyOutcome(outcome) !== "real") {
        continue;
      }
      const { ns, ew } = idOf(line);
      add(ns, access.getNs(line));
      add(ew, access.getEw(line));
    }
  }

  const avg = new Map<string, number>();
  for (const [id, n] of count) {
    if (n > 0) avg.set(id, (sum.get(id) ?? 0) / n);
  }
  return avg;
}

/**
 * The IMPs a side's AVE+ / AVE− award is worth, applying the §4.1.1.1 override
 * from that side's windowed average `avg`, or null when the side's flat value
 * is not an exact AVE+ (+3) / AVE− (−3) (so it is left untouched).
 *
 * - AVE+ (+3) → `max(+3, avg)`.
 * - AVE− (−3) → `min(−3, avg)`.
 *
 * `avg` undefined (the pair has no real boards in the window) → the flat ±3.
 */
function overriddenSideImps(
  flatImps: number,
  avg: number | undefined,
): number | null {
  if (flatImps === AVE_PLUS_IMPS) {
    return avg === undefined ? AVE_PLUS_IMPS : Math.max(AVE_PLUS_IMPS, avg);
  }
  if (flatImps === AVE_MINUS_IMPS) {
    return avg === undefined ? AVE_MINUS_IMPS : Math.min(AVE_MINUS_IMPS, avg);
  }
  return null;
}

/**
 * Apply the §4.1.1.1 "better than average" override to a window of scored IMP
 * or Cross-IMP boards, returning a new array in which each AVE+/AVE− side of an
 * artificial line is re-valued from the pair's windowed average IMP.
 * Non-artificial lines, the 0 (AVE) side, and artificial sides whose flat value
 * is not exactly ±3 are unchanged. A no-op when no artificial AVE+/AVE− line is
 * present.
 *
 * Each side is re-valued INDEPENDENTLY against its own average, so an outside-
 * agency AVE+/AVE+ (both +3) can legitimately lift both sides.
 */
function applyBetterThanAverageImp<L extends { outcome?: unknown }>(
  boards: ScoredImpBoard<L>[],
  access: SideAccess<L>,
  idOf: (line: L) => { ns: string; ew: string },
): ScoredImpBoard<L>[] {
  const avg = windowedAverageImps(boards, access, idOf);

  return boards.map((board) => ({
    board: board.board,
    lines: board.lines.map((line): L => {
      const outcome = line.outcome;
      if (typeof outcome !== "string") return line;
      if (classifyOutcome(outcome) !== "artificial") return line;
      // parseAdjustedScore confirms the A<ns>/<ew> shape; the per-board scorer
      // already turned those percentages into the flat ±3/0 we read off the
      // line, so we only gate on it being a well-formed artificial award.
      if (parseAdjustedScore(outcome) == null) return line;

      const { ns, ew } = idOf(line);
      const nsOverride = overriddenSideImps(access.getNs(line), avg.get(ns));
      const ewOverride = overriddenSideImps(access.getEw(line), avg.get(ew));

      if (nsOverride === null && ewOverride === null) return line;

      return access.withSides(
        line,
        nsOverride ?? access.getNs(line),
        ewOverride ?? access.getEw(line),
      );
    }),
  }));
}

/* ============================================================
   PUBLIC: IMP and Cross-IMP specialisations
============================================================ */

/**
 * Apply §4.1.1.1 to a window of scored Butler-IMP boards (`nsImps`/`ewImps`).
 * See {@link applyBetterThanAverageImp}.
 */
export function applyBetterThanAverageImpBoards(
  boards: ScoredImpBoard<ImpLine>[],
): ScoredImpBoard<ImpLine>[] {
  return applyBetterThanAverageImp<ImpLine>(
    boards,
    {
      getNs: (l) => l.nsImps,
      getEw: (l) => l.ewImps,
      withSides: (l, ns, ew) => ({ ...l, nsImps: ns, ewImps: ew }),
    },
    (l) => ({ ns: l.nsId, ew: l.ewId }),
  );
}

/**
 * Apply §4.1.1.1 to a window of scored Cross-IMP boards
 * (`nsCrossImps`/`ewCrossImps`). See {@link applyBetterThanAverageImp}.
 */
export function applyBetterThanAverageXimpBoards(
  boards: ScoredImpBoard<XimpLine>[],
): ScoredImpBoard<XimpLine>[] {
  return applyBetterThanAverageImp<XimpLine>(
    boards,
    {
      getNs: (l) => l.nsCrossImps,
      getEw: (l) => l.ewCrossImps,
      withSides: (l, ns, ew) => ({ ...l, nsCrossImps: ns, ewCrossImps: ew }),
    },
    (l) => ({ ns: l.nsId, ew: l.ewId }),
  );
}
