import { create } from "xmlbuilder2";
import {
  formatOutcomeForUsebio,
  formatLeadForUsebio,
  isAdjustedScore,
  parseAdjustedScore,
} from "./format-contract";
import { outcomeToScore } from "@/scoring/traveller/common";
import { scoreMP as scorePairMP } from "@/scoring/traveller/pair/mp";
import { scoreIMP as scorePairIMP } from "@/scoring/traveller/pair/imp";
import { scoreXIMP as scorePairXIMP } from "@/scoring/traveller/pair/x-imp";
import { BoardOutcome } from "@/model/score";
import { Card } from "@/model/common";
import { ScoringType } from "@/db/games/types/scoring-type";

/**
 * USEBIO 1.2 XML Generator
 *
 * Generates a valid USEBIO 1.2 XML file from game data using xmlbuilder2.
 * Reference: https://usebio.org/documentation/usebio-1.2.pdf
 */

/* ============================================================
   INPUT TYPES
============================================================ */

export type UsebioClub = {
  name: string;
  clubNumber: string;
};

export type UsebioPlayer = {
  firstName: string;
  lastName: string;
  nationalId: string | null;
};

export type UsebioPair = {
  pairNumber: string;
  direction: "N" | "E";
  player1: UsebioPlayer;
  player2: UsebioPlayer;
};

export type UsebioBoardResult = {
  table: number;
  board: number;
  round: number;
  nsPairNumber: string;
  ewPairNumber: string;
  outcome: BoardOutcome;
  lead: Card | null;
};

export type UsebioGameData = {
  club: UsebioClub;
  eventName: string;
  eventDate: string;
  scoringType: ScoringType;
  tables: number;
  sectionName: string;
  boards: number;
  pairs: UsebioPair[];
  boardResults: UsebioBoardResult[];
};

/* ============================================================
   SCORING TYPE MAPPING
============================================================ */

const SCORING_TYPE_MAP: Record<ScoringType, string> = {
  MP: "MP",
  IMP: "BUTLER",
  XIMP: "XIMP",
};

/* ============================================================
   ADJUSTED SCORE IMP VALUES

   For IMP/XIMP scoring, adjusted scores are assigned fixed IMP values:
     AVE+ (>50%) → +3 IMPs for that side
     AVE  (50%)  →  0 IMPs
     AVE- (<50%) → -3 IMPs for that side
============================================================ */

function adjustedImps(percent: number): number {
  if (percent > 50) return 3;
  if (percent < 50) return -3;
  return 0;
}

/* ============================================================
   SCORING-TYPE DESCRIPTORS

   The one place USEBIO branches on scoring type. Each descriptor knows how to
   turn a board's scorable lines into normalised { ns, ew } numbers, how to
   value an adjusted score, and whether its scores contribute to a MAX (only MP
   ranks as a percentage of a per-board maximum; IMP/XIMP accumulate raw IMPs).
   Adding a scoring type is one entry here rather than edits scattered across
   the board loop, computeBoardScores, and the ranking accumulator.
============================================================ */

type ScoreResult = { ns: number; ew: number };

interface UsebioScoreDescriptor {
  /** Score a board's scorable (non-adjusted) lines to { ns, ew } per line. */
  scoreLines: (board: number, lines: PairScoringLine[]) => LineScore[];
  /** Value an adjusted score for a board with `lineCount` results on it. */
  adjusted: (adj: { ns: number; ew: number }, lineCount: number) => ScoreResult;
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
    adjusted: (adj, lineCount) => {
      // MP: assign matchpoints as a percentage of the per-board maximum.
      const maxMp = 2 * (lineCount - 1);
      return {
        ns: Math.round((adj.ns / 100) * maxMp),
        ew: Math.round((adj.ew / 100) * maxMp),
      };
    },
    contributesToMax: true,
  },
  IMP: {
    scoreLines: (board, lines) =>
      scorePairIMP(board, lines).map((l) => ({
        nsId: l.nsId,
        ewId: l.ewId,
        ns: l.nsImps,
        ew: l.ewImps,
      })),
    adjusted: (adj) => ({ ns: adjustedImps(adj.ns), ew: adjustedImps(adj.ew) }),
    contributesToMax: false,
  },
  XIMP: {
    scoreLines: (board, lines) =>
      scorePairXIMP(board, lines).map((l) => ({
        nsId: l.nsId,
        ewId: l.ewId,
        ns: l.nsCrossImps,
        ew: l.ewCrossImps,
      })),
    adjusted: (adj) => ({ ns: adjustedImps(adj.ns), ew: adjustedImps(adj.ew) }),
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

/* ============================================================
   GENERATOR
============================================================ */

export function generateUsebioXml(data: UsebioGameData): string {
  const doc = create({ version: "1.0", encoding: "UTF-8" });

  const root = doc.ele("USEBIO", { Version: "1.2" });

  // CLUB
  const clubEl = root.ele("CLUB");
  clubEl.ele("CLUB_NAME").txt(data.club.name);
  clubEl.ele("CLUB_ID_NUMBER").txt(data.club.clubNumber);

  // EVENT
  const event = root.ele("EVENT", { EVENT_TYPE: "MP_PAIRS" });
  event.ele("EVENT_DESCRIPTION").txt(data.eventName);
  event.ele("DATE").txt(formatDate(data.eventDate));
  event
    .ele("BOARD_SCORING_METHOD")
    .txt(SCORING_TYPE_MAP[data.scoringType] ?? "MP");
  event.ele("BOARDS").txt(String(data.boards));

  // PARTICIPANTS — each pair is tagged with its real section (derived from the
  // section-qualified pair number, falling back to the game's section label).
  const participants = event.ele("PARTICIPANTS");
  for (const pair of data.pairs) {
    const dir = pair.direction === "N" ? "NS" : "EW";
    const pairEl = participants.ele("PAIR", {
      PAIR_NUMBER: pair.pairNumber,
      DIRECTION: dir,
      SECTION_ID: sectionOf(pair.pairNumber, data.sectionName),
    });

    addPlayer(pairEl, pair.player1);
    addPlayer(pairEl, pair.player2);
  }

  // BOARD_RESULTS
  const boardResultsEl = event.ele("BOARD_RESULTS");

  const boardGroups = groupBy(data.boardResults, (r) => r.board);
  const boardNumbers = [...boardGroups.keys()].sort((a, b) => a - b);

  for (const boardNum of boardNumbers) {
    const results = boardGroups.get(boardNum)!;
    const scoredLines = computeBoardScores(boardNum, results, data.scoringType);

    const boardEl = boardResultsEl.ele("BOARD", {
      BOARD_NUMBER: String(boardNum),
    });

    for (const result of results) {
      const key = resultKey(result);
      const resultEl = boardEl.ele("RESULT");
      resultEl.ele("NS_PAIR_NUMBER").txt(result.nsPairNumber);
      resultEl.ele("EW_PAIR_NUMBER").txt(result.ewPairNumber);

      if (isAdjustedScore(result.outcome)) {
        const adj = parseAdjustedScore(result.outcome);
        resultEl.ele("CONTRACT").txt("");
        resultEl.ele("DECLARER").txt("");
        resultEl.ele("LEAD").txt("");
        resultEl.ele("RESULT_FIELD").txt("");
        resultEl.ele("SCORE").txt("0");

        // `adj` is always non-null here because isAdjustedScore() and
        // parseAdjustedScore() share the same regex; `?? { ns: 0, ew: 0 }` is
        // unreachable defensive code.
        /* v8 ignore next */
        const line = scoreDescriptorFor(data.scoringType).adjusted(
          adj ?? { ns: 0, ew: 0 },
          results.length,
        );
        appendLineScore(resultEl, data.scoringType, line);
        resultEl.ele("ARTIFICIAL_SCORE").txt("Adjusted");
      } else {
        const formatted = formatOutcomeForUsebio(result.outcome);
        const score = outcomeToScore(boardNum, result.outcome);
        const lead = formatLeadForUsebio(result.lead);
        const lineScore = scoredLines.get(key);

        resultEl.ele("CONTRACT").txt(formatted.contract);
        resultEl.ele("DECLARER").txt(formatted.declarer);
        resultEl.ele("LEAD").txt(lead);
        resultEl.ele("RESULT_FIELD").txt(formatted.result);
        resultEl.ele("SCORE").txt(String(score ?? 0));

        if (lineScore) {
          appendLineScore(resultEl, data.scoringType, lineScore);
        }
      }
    }
  }

  // RANKING
  const ranking = computeOverallRanking(data);
  if (ranking.length > 0) {
    const rankingEl = event.ele("RANKING");
    for (const entry of ranking) {
      rankingEl.ele("RANK", {
        PAIR_NUMBER: entry.pairNumber,
        DIRECTION: entry.direction,
        SECTION_ID: sectionOf(entry.pairNumber, data.sectionName),
        TOTAL_SCORE: String(entry.totalScore),
        MAX_SCORE: String(entry.maxScore),
        PERCENTAGE: entry.percentage,
        PLACE: String(entry.place),
      });
    }
  }

  return doc.end({ prettyPrint: true, indent: "  " });
}

/* ============================================================
   HELPERS
============================================================ */

/**
 * Derive the section id from a section-qualified pair number (e.g. "A1NS" ->
 * "A"). Falls back to the provided default when the id is not section-prefixed.
 */
function sectionOf(pairNumber: string, fallback: string): string {
  const match = /^([A-Z]+)\d+(?:NS|EW)$/.exec(pairNumber);
  return match ? match[1] : fallback || "A";
}

function addPlayer(parentEl: ReturnType<typeof create>, player: UsebioPlayer) {
  const playerEl = parentEl.ele("PLAYER");
  playerEl.ele("PLAYER_NAME").txt(`${player.firstName} ${player.lastName}`);
  if (player.nationalId) {
    playerEl.ele("NATIONAL_ID_NUMBER").txt(player.nationalId);
  }
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
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

/**
 * Write a line's NS/EW score onto a RESULT element using the USEBIO element
 * names for the scoring type (match points for MP, IMPs for IMP/XIMP). Shared
 * by the normal-result and adjusted-score branches.
 */
function appendLineScore(
  resultEl: ReturnType<ReturnType<typeof create>["ele"]>,
  scoringType: ScoringType,
  line: ScoreResult,
): void {
  if (scoringType === "MP") {
    resultEl.ele("NS_MATCH_POINTS").txt(String(line.ns));
    resultEl.ele("EW_MATCH_POINTS").txt(String(line.ew));
  } else {
    resultEl.ele("NS_IMPS").txt(String(line.ns));
    resultEl.ele("EW_IMPS").txt(String(line.ew));
  }
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
 * Computes per-line scores for a board, excluding adjusted scores from the
 * computation. Returns MP for MP scoring, or IMPs for IMP/XIMP scoring,
 * normalised to { ns, ew } via the scoring-type descriptor.
 */
function computeBoardScores(
  board: number,
  results: UsebioBoardResult[],
  scoringType: ScoringType,
): Map<string, ScoreResult> {
  // Filter out adjusted scores — they don't participate in normal scoring.
  const lines: PairScoringLine[] = results
    .filter((r) => !isAdjustedScore(r.outcome))
    .map((r) => ({
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

function computeOverallRanking(data: UsebioGameData): RankEntry[] {
  const totals = new Map<string, PairTotals>();
  const descriptor = scoreDescriptorFor(data.scoringType);

  const boardGroups = groupBy(data.boardResults, (r) => r.board);

  for (const [boardNum, results] of boardGroups) {
    const scoredLines = computeBoardScores(boardNum, results, data.scoringType);

    // Normally scored lines. For MP the per-board maximum a pair can earn is
    // ns+ew (they split the same pot); IMP/XIMP have no such maximum.
    for (const [key, lineScore] of scoredLines) {
      const [, nsId, ewId] = key.split("-");
      const maxForBoard = descriptor.contributesToMax
        ? lineScore.ns + lineScore.ew
        : 0;
      accumulate(totals, nsId, "NS", lineScore.ns, maxForBoard);
      accumulate(totals, ewId, "EW", lineScore.ew, maxForBoard);
    }

    // Adjusted scores, valued via the same descriptor as the board loop.
    for (const result of results) {
      if (!isAdjustedScore(result.outcome)) continue;
      const adj = parseAdjustedScore(result.outcome);
      /* v8 ignore next -- unreachable: isAdjustedScore() passing guarantees
         parseAdjustedScore() returns non-null (shared regex). */
      if (!adj) continue;

      const line = descriptor.adjusted(adj, results.length);
      const maxForBoard = descriptor.contributesToMax
        ? 2 * (results.length - 1)
        : 0;
      accumulate(totals, result.nsPairNumber, "NS", line.ns, maxForBoard);
      accumulate(totals, result.ewPairNumber, "EW", line.ew, maxForBoard);
    }
  }

  const entries: RankEntry[] = [];
  for (const [pairNumber, pairData] of totals) {
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
