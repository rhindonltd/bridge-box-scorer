import {
  applyBetterThanAverage,
  applyBetterThanAverageXimpBoards,
  equaliseMpBoards,
  outcomeToScore,
  roundMpBoards,
  scoreMP as scorePairMP,
  scoreXIMP as scorePairXIMP,
} from "@/modules/scoring";
import type {
  UsebioBoardResult,
  UsebioPairPlacing,
  UsebioPairsData,
} from "@/modules/interchange/usebio";
import { isAssignedOutcome } from "@/model/adjusted-score";
import { BoardOutcome } from "@/model/score";
import { ScoringType } from "@/model/game-types";

/**
 * The board-pooled pairs USEBIO export's scoring: each traveller line's
 * contract score and matchpoints / IMPs, and each section's placings. The
 * interchange module only lays these out.
 */

/** A pairs result before scoring: no contract score or line score yet. */
export type UnscoredPairsResult = Omit<
  UsebioBoardResult,
  "score" | "lineScore"
>;

/** The pairs export data before scoring. */
export type UnscoredPairsData = Omit<
  UsebioPairsData,
  "placings" | "boardResults"
> & {
  boardResults: UnscoredPairsResult[];
  /**
   * EBU §2.4.9 — section-qualified seats (e.g. "A1NS") whose pair is "without
   * standing" / removed-withdrawn: dropped from the placings, though its
   * results still count for its opponents. Absent/empty means nobody is
   * excluded.
   */
  excludedFromRanking?: ReadonlySet<string>;
};

/**
 * Score the pairs export: every line's contract score and its matchpoints or
 * IMPs, and the placings of each section's field. Each section is scored on
 * its own, so the same board number played in two sections is scored
 * independently and section-local pair numbers do not collide.
 */
export function scoreMpPairs(data: UnscoredPairsData): UsebioPairsData {
  const { excludedFromRanking, boardResults, ...rest } = data;
  const sectionIds =
    data.sections && data.sections.length > 0
      ? data.sections
      : [data.sectionName || "A"];
  const defaultSection = data.sectionName || "A";
  const excludedQualified = excludedFromRanking ?? new Set<string>();

  const scored: UsebioBoardResult[] = boardResults.map((r) => ({
    ...r,
    score: isAssignedOutcome(r.outcome)
      ? null
      : outcomeToScore(r.board, r.outcome),
  }));
  const placings: UsebioPairPlacing[] = [];

  for (const sectionId of sectionIds) {
    const inSection = (section: string | undefined) =>
      (section ?? defaultSection) === sectionId;
    const sectionPairs = data.pairs.filter((p) => inSection(p.section));
    const sectionResults = scored.filter((r) => inSection(r.section));

    // Pair numbers in this path are section-LOCAL (e.g. "1NS"); the exclusion
    // set is section-QUALIFIED ("A1NS"). Reduce it to the section-local numbers
    // whose qualified id (sectionId + number) is excluded.
    const excludedLocal = new Set<string>();
    for (const pair of sectionPairs) {
      if (excludedQualified.has(sectionId + pair.pairNumber)) {
        excludedLocal.add(pair.pairNumber);
      }
    }

    for (const entry of computeOverallRanking(
      data.scoringType,
      sectionResults,
      excludedLocal,
    )) {
      placings.push({
        section: sectionId,
        pairNumber: entry.pairNumber,
        percentage: entry.percentage,
        place: entry.place,
      });
    }

    for (const [boardNum, results] of groupBy(sectionResults, (r) => r.board)) {
      const lineScores = computeBoardScores(
        boardNum,
        results,
        data.scoringType,
      );
      for (const result of results) {
        const lineScore = lineScores.get(resultKey(result));
        if (lineScore) result.lineScore = lineScore;
      }
    }
  }

  return { ...rest, boardResults: scored, placings };
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  }
  return map;
}

function resultKey(r: UsebioBoardResult): string {
  return `${r.board}-${r.nsPairNumber}-${r.ewPairNumber}`;
}

/* ============================================================
   SCORING-TYPE DESCRIPTORS

   The one place USEBIO branches on scoring type. Each descriptor knows how to
   turn a board's lines into normalised { ns, ew } numbers, and whether its
   scores contribute to a MAX (only MP ranks as a percentage of a per-board
   maximum; IMP/XIMP accumulate raw IMPs).

   Director-assigned lines (artificial adjusted `A<ns>/<ew>` and weighted
   assigned `W…`) are NOT handled here any more: the shared per-board scorers
   (`scorePairMP` / `scorePairXIMP`) now value them inline
   alongside the real played lines, so the live leaderboard and this export use
   exactly the same matchpointing (convention (b): an assigned line occupies a
   seat in the field). The descriptor therefore just forwards every line to the
   scorer.
============================================================ */

type ScoreResult = { ns: number; ew: number };

interface UsebioScoreDescriptor {
  /** Score all of a board's lines to { ns, ew } per line. */
  scoreLines: (board: number, lines: PairScoringLine[]) => LineScore[];
  /** Whether a line's ns+ew contributes to the ranking MAX (MP only). */
  contributesToMax: boolean;
}

type PairScoringLine = { outcome: BoardOutcome; nsId: string; ewId: string };
type LineScore = { nsId: string; ewId: string; ns: number; ew: number };

const SCORE_DESCRIPTORS: Record<string, UsebioScoreDescriptor> = {
  MP: {
    scoreLines: (board, lines) =>
      scorePairMP(board, lines).map((l) => ({
        nsId: l.nsId,
        ewId: l.ewId,
        ns: l.nsMatchPoints,
        ew: l.ewMatchPoints,
      })),
    contributesToMax: true,
  },
  XIMP: {
    scoreLines: (board, lines) =>
      scorePairXIMP(board, lines).map((l) => ({
        nsId: l.nsId,
        ewId: l.ewId,
        ns: l.nsCrossImps,
        ew: l.ewCrossImps,
      })),
    contributesToMax: false,
  },
};

/**
 * Resolve the descriptor for a scoring type, falling back to MP for an
 * unrecognised value (mirrors the `?? "MP"` fallback on the header's
 * BOARD_SCORING_METHOD, so malformed data still produces valid XML).
 */
function scoreDescriptorFor(scoringType: ScoringType): UsebioScoreDescriptor {
  return SCORE_DESCRIPTORS[scoringType] ?? SCORE_DESCRIPTORS.MP;
}

/** Running per-pair totals used to build the overall ranking. */
type PairTotals = { total: number; max: number; direction: string };

/**
 * Add a pair's contribution for one board into the totals map, creating the
 * entry on first sight. `maxDelta` is only added for scoring types that rank as
 * a percentage of a maximum (MP); IMP/XIMP pass 0. Collapses the four
 * copy-pasted get-or-create-then-add blocks the ranking previously had.
 */
function accumulate(
  totals: Map<string, PairTotals>,
  pairId: string,
  direction: "NS" | "EW",
  scoreDelta: number,
  maxDelta: number,
): void {
  const entry = totals.get(pairId) ?? { total: 0, max: 0, direction };
  entry.total += scoreDelta;
  entry.max += maxDelta > 0 ? maxDelta : 0;
  totals.set(pairId, entry);
}

/**
 * Computes per-line scores for a board — ALL lines (real, artificial adjusted,
 * weighted assigned) — via the shared per-board scorer. Returns MP for MP
 * scoring, or IMPs for IMP/XIMP scoring, normalised to { ns, ew }.
 */
function computeBoardScores(
  board: number,
  results: UsebioBoardResult[],
  scoringType: ScoringType,
): Map<string, ScoreResult> {
  // Every line (real played, artificial adjusted, or weighted assigned) is
  // scored by the shared per-board scorer — assigned lines are valued inline,
  // so there is no longer a separate adjusted-score pass.
  const lines: PairScoringLine[] = results.map((r) => ({
    outcome: r.outcome,
    nsId: r.nsPairNumber,
    ewId: r.ewPairNumber,
  }));

  const map = new Map<string, ScoreResult>();
  for (const line of scoreDescriptorFor(scoringType).scoreLines(board, lines)) {
    map.set(`${board}-${line.nsId}-${line.ewId}`, {
      ns: line.ns,
      ew: line.ew,
    });
  }
  return map;
}

type RankEntry = {
  pairNumber: string;
  direction: string;
  totalScore: number;
  maxScore: number;
  percentage: string;
  place: number;
};

/**
 * Compute the placings for one section's field: totals accumulated across that
 * section's board results and turned into a percentage-ordered ranking. Callers
 * pass only the results for a single section so pair numbers (which are
 * unprefixed and therefore only unique within a section) do not collide.
 */
function computeOverallRanking(
  scoringType: ScoringType,
  boardResults: UsebioBoardResult[],
  excludedPairNumbers: ReadonlySet<string> = new Set(),
): RankEntry[] {
  const totals = new Map<string, PairTotals>();
  const descriptor = scoreDescriptorFor(scoringType);

  const boardGroups = groupBy(boardResults, (r) => r.board);

  // Matchpoints pool across boards into a percentage ranking, so — exactly as
  // the live leaderboard does — short boards must be equalised to the full
  // field (EBU White Book §4.2.3) before accumulation. IMP/XIMP accumulate raw
  // (datum-less) IMPs with no per-board maximum, so no equalisation applies.
  if (scoringType === "MP") {
    const scoredBoards = Array.from(boardGroups, ([boardNum, results]) => ({
      board: boardNum,
      lines: scorePairMP(
        boardNum,
        results.map((r) => ({
          outcome: r.outcome,
          nsId: r.nsPairNumber,
          ewId: r.ewPairNumber,
        })),
      ),
    }));

    // §4.1.1.1 "better than average" applies to the RANKING only (not the
    // per-board TRAVELLER_LINE detail, which keeps the flat 60/40), matching the
    // live leaderboard and the on-screen board display. §4.2.6.1: round each
    // board to the nearest whole matchpoint (halves away from average) LAST, so
    // the exported ranking sums the same rounded board scores the leaderboard
    // does.
    const ranked = roundMpBoards(
      applyBetterThanAverage(equaliseMpBoards(scoredBoards)),
    );
    for (const b of ranked) {
      for (const line of b.lines) {
        const maxForBoard = line.maxMatchPoints;
        accumulate(totals, line.nsId, "NS", line.nsMatchPoints, maxForBoard);
        accumulate(totals, line.ewId, "EW", line.ewMatchPoints, maxForBoard);
      }
    }
  } else if (scoringType === "XIMP") {
    // Cross-IMP: score every board (keeping the per-board scored lines so the
    // §4.1.1.1 uplift can see each pair's own board results), apply the
    // "better than average" AVE+/AVE− uplift across the whole field, THEN
    // accumulate — mirroring the MP branch so the exported totals match the
    // live leaderboard. Cross-IMP lines never contribute to a ranking MAX
    // (`contributesToMax` is false for them), so `maxForBoard` stays 0.
    const scored = Array.from(boardGroups, ([boardNum, results]) => ({
      board: boardNum,
      lines: scorePairXIMP(
        boardNum,
        results.map((r) => ({
          outcome: r.outcome,
          nsId: r.nsPairNumber,
          ewId: r.ewPairNumber,
        })),
      ),
    }));
    for (const b of applyBetterThanAverageXimpBoards(scored)) {
      for (const line of b.lines) {
        accumulate(totals, line.nsId, "NS", line.nsCrossImps, 0);
        accumulate(totals, line.ewId, "EW", line.ewCrossImps, 0);
      }
    }
  } else {
    for (const [boardNum, results] of boardGroups) {
      const scoredLines = computeBoardScores(boardNum, results, scoringType);

      // All lines — real played and director-assigned — are already in the
      // scored-lines map. Accumulate every one into the pair totals.
      for (const [key, lineScore] of scoredLines) {
        const [, nsId, ewId] = key.split("-");
        /* v8 ignore next 3 -- unreachable: MP/XIMP are handled above, so this branch only sees the MP fallback descriptor (contributesToMax is always true) */
        const maxForBoard = descriptor.contributesToMax
          ? lineScore.ns + lineScore.ew
          : 0;
        accumulate(totals, nsId, "NS", lineScore.ns, maxForBoard);
        accumulate(totals, ewId, "EW", lineScore.ew, maxForBoard);
      }
    }
  }

  const entries: RankEntry[] = [];
  for (const [pairNumber, pairData] of totals) {
    // §2.4.9: a without-standing pair is dropped from the placings. Its board
    // results already accumulated into every opponent's totals above, so the
    // opponents' percentages stand; only this pair gets no ranked entry.
    if (excludedPairNumbers.has(pairNumber)) continue;
    const percentage =
      pairData.max > 0
        ? ((pairData.total / pairData.max) * 100).toFixed(2)
        : "0.00";
    entries.push({
      pairNumber,
      direction: pairData.direction,
      totalScore: pairData.total,
      maxScore: pairData.max,
      percentage,
      place: 0,
    });
  }

  entries.sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));

  let place = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].percentage !== entries[i - 1].percentage) {
      place = i + 1;
    }
    entries[i].place = place;
  }

  return entries;
}
