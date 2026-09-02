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

        if (data.scoringType === "MP") {
          // For MP: assign matchpoints as percentage of maximum
          const maxMp = 2 * (results.length - 1);
          const nsMp = adj ? Math.round((adj.ns / 100) * maxMp) : 0;
          const ewMp = adj ? Math.round((adj.ew / 100) * maxMp) : 0;
          resultEl.ele("NS_MATCH_POINTS").txt(String(nsMp));
          resultEl.ele("EW_MATCH_POINTS").txt(String(ewMp));
        } else {
          // For IMP/XIMP: AVE+ = +3, AVE = 0, AVE- = -3
          const nsImps = adj ? adjustedImps(adj.ns) : 0;
          const ewImps = adj ? adjustedImps(adj.ew) : 0;
          resultEl.ele("NS_IMPS").txt(String(nsImps));
          resultEl.ele("EW_IMPS").txt(String(ewImps));
        }
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
          if (data.scoringType === "MP") {
            resultEl.ele("NS_MATCH_POINTS").txt(String(lineScore.ns));
            resultEl.ele("EW_MATCH_POINTS").txt(String(lineScore.ew));
          } else {
            resultEl.ele("NS_IMPS").txt(String(lineScore.ns));
            resultEl.ele("EW_IMPS").txt(String(lineScore.ew));
          }
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

type ScoreResult = { ns: number; ew: number };

/**
 * Computes per-line scores for a board, excluding adjusted scores from the computation.
 * Returns MP for MP scoring, or IMPs for IMP/XIMP scoring.
 */
function computeBoardScores(
  board: number,
  results: UsebioBoardResult[],
  scoringType: ScoringType,
): Map<string, ScoreResult> {
  // Filter out adjusted scores — they don't participate in normal scoring
  const scorableResults = results.filter((r) => !isAdjustedScore(r.outcome));

  const lines = scorableResults.map((r) => ({
    outcome: r.outcome,
    nsId: r.nsPairNumber,
    ewId: r.ewPairNumber,
  }));

  const map = new Map<string, ScoreResult>();

  if (scoringType === "MP") {
    const scored = scorePairMP(board, lines);
    for (const line of scored) {
      map.set(`${board}-${line.nsId}-${line.ewId}`, {
        ns: line.nsMatchPoints,
        ew: line.ewMatchPoints,
      });
    }
  } else if (scoringType === "IMP") {
    const scored = scorePairIMP(board, lines);
    for (const line of scored) {
      map.set(`${board}-${line.nsId}-${line.ewId}`, {
        ns: line.nsImps,
        ew: line.ewImps,
      });
    }
  } else {
    // XIMP
    const scored = scorePairXIMP(board, lines);
    for (const line of scored) {
      map.set(`${board}-${line.nsId}-${line.ewId}`, {
        ns: line.nsCrossImps,
        ew: line.ewCrossImps,
      });
    }
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
  const totals = new Map<
    string,
    { total: number; max: number; direction: string }
  >();

  const boardGroups = groupBy(data.boardResults, (r) => r.board);

  for (const [boardNum, results] of boardGroups) {
    const scoredLines = computeBoardScores(boardNum, results, data.scoringType);

    // Handle normally scored lines
    for (const [key, lineScore] of scoredLines) {
      const parts = key.split("-");
      const nsId = parts[1];
      const ewId = parts[2];

      if (data.scoringType === "MP") {
        const maxForBoard = lineScore.ns + lineScore.ew;

        const nsEntry = totals.get(nsId) ?? {
          total: 0,
          max: 0,
          direction: "NS",
        };
        nsEntry.total += lineScore.ns;
        nsEntry.max += maxForBoard > 0 ? maxForBoard : 0;
        totals.set(nsId, nsEntry);

        const ewEntry = totals.get(ewId) ?? {
          total: 0,
          max: 0,
          direction: "EW",
        };
        ewEntry.total += lineScore.ew;
        ewEntry.max += maxForBoard > 0 ? maxForBoard : 0;
        totals.set(ewId, ewEntry);
      } else {
        // IMP/XIMP — accumulate IMPs
        const nsEntry = totals.get(nsId) ?? {
          total: 0,
          max: 0,
          direction: "NS",
        };
        nsEntry.total += lineScore.ns;
        totals.set(nsId, nsEntry);

        const ewEntry = totals.get(ewId) ?? {
          total: 0,
          max: 0,
          direction: "EW",
        };
        ewEntry.total += lineScore.ew;
        totals.set(ewId, ewEntry);
      }
    }

    // Handle adjusted scores
    for (const result of results) {
      if (!isAdjustedScore(result.outcome)) continue;
      const adj = parseAdjustedScore(result.outcome);
      if (!adj) continue;

      if (data.scoringType === "MP") {
        const maxMp = 2 * (results.length - 1);
        const nsMp = Math.round((adj.ns / 100) * maxMp);
        const ewMp = Math.round((adj.ew / 100) * maxMp);

        const nsEntry = totals.get(result.nsPairNumber) ?? {
          total: 0,
          max: 0,
          direction: "NS",
        };
        nsEntry.total += nsMp;
        nsEntry.max += maxMp > 0 ? maxMp : 0;
        totals.set(result.nsPairNumber, nsEntry);

        const ewEntry = totals.get(result.ewPairNumber) ?? {
          total: 0,
          max: 0,
          direction: "EW",
        };
        ewEntry.total += ewMp;
        ewEntry.max += maxMp > 0 ? maxMp : 0;
        totals.set(result.ewPairNumber, ewEntry);
      } else {
        // IMP/XIMP: AVE+ = +3, AVE = 0, AVE- = -3
        const nsImps = adjustedImps(adj.ns);
        const ewImps = adjustedImps(adj.ew);

        const nsEntry = totals.get(result.nsPairNumber) ?? {
          total: 0,
          max: 0,
          direction: "NS",
        };
        nsEntry.total += nsImps;
        totals.set(result.nsPairNumber, nsEntry);

        const ewEntry = totals.get(result.ewPairNumber) ?? {
          total: 0,
          max: 0,
          direction: "EW",
        };
        ewEntry.total += ewImps;
        totals.set(result.ewPairNumber, ewEntry);
      }
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
