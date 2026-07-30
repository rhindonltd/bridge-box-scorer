import { create } from "xmlbuilder2";
import { formatOutcomeForUsebio, formatLeadForUsebio } from "./format-contract";
import { outcomeToScore } from "@/scoring/traveller/common";
import { scoreMP as scorePairMP } from "@/scoring/traveller/pair/mp";
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
  event.ele("BOARD_SCORING_METHOD").txt(SCORING_TYPE_MAP[data.scoringType] ?? "MP");
  event.ele("BOARDS").txt(String(data.boards));

  // PARTICIPANTS
  const participants = event.ele("PARTICIPANTS");
  for (const pair of data.pairs) {
    const dir = pair.direction === "N" ? "NS" : "EW";
    const pairEl = participants.ele("PAIR", {
      PAIR_NUMBER: pair.pairNumber,
      DIRECTION: dir,
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
    const mpLines = computeBoardMatchpoints(boardNum, results);

    const boardEl = boardResultsEl.ele("BOARD", { BOARD_NUMBER: String(boardNum) });

    for (const result of results) {
      const formatted = formatOutcomeForUsebio(result.outcome);
      const score = outcomeToScore(boardNum, result.outcome);
      const lead = formatLeadForUsebio(result.lead);
      const mp = mpLines.get(resultKey(result));

      const resultEl = boardEl.ele("RESULT");
      resultEl.ele("NS_PAIR_NUMBER").txt(result.nsPairNumber);
      resultEl.ele("EW_PAIR_NUMBER").txt(result.ewPairNumber);
      resultEl.ele("CONTRACT").txt(formatted.contract);
      resultEl.ele("DECLARER").txt(formatted.declarer);
      resultEl.ele("LEAD").txt(lead);
      resultEl.ele("RESULT_FIELD").txt(formatted.result);
      resultEl.ele("SCORE").txt(String(score ?? 0));

      if (mp) {
        resultEl.ele("NS_MATCH_POINTS").txt(String(mp.ns));
        resultEl.ele("EW_MATCH_POINTS").txt(String(mp.ew));
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
        TOTAL_SCORE: String(entry.totalMp),
        MAX_SCORE: String(entry.maxMp),
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

type MatchpointResult = { ns: number; ew: number };

function computeBoardMatchpoints(
  board: number,
  results: UsebioBoardResult[],
): Map<string, MatchpointResult> {
  const lines = results.map((r) => ({
    outcome: r.outcome,
    nsId: r.nsPairNumber,
    ewId: r.ewPairNumber,
  }));

  const scored = scorePairMP(board, lines);
  const map = new Map<string, MatchpointResult>();

  for (const line of scored) {
    map.set(`${board}-${line.nsId}-${line.ewId}`, {
      ns: line.nsMatchPoints,
      ew: line.ewMatchPoints,
    });
  }

  return map;
}

type RankEntry = {
  pairNumber: string;
  direction: string;
  totalMp: number;
  maxMp: number;
  percentage: string;
  place: number;
};

function computeOverallRanking(data: UsebioGameData): RankEntry[] {
  const totals = new Map<string, { total: number; max: number; direction: string }>();

  const boardGroups = groupBy(data.boardResults, (r) => r.board);

  for (const [boardNum, results] of boardGroups) {
    const mpLines = computeBoardMatchpoints(boardNum, results);

    for (const [key, mp] of mpLines) {
      const parts = key.split("-");
      const nsId = parts[1];
      const ewId = parts[2];
      const maxForBoard = mp.ns + mp.ew;

      const nsEntry = totals.get(nsId) ?? { total: 0, max: 0, direction: "NS" };
      nsEntry.total += mp.ns;
      nsEntry.max += maxForBoard > 0 ? maxForBoard : 0;
      totals.set(nsId, nsEntry);

      const ewEntry = totals.get(ewId) ?? { total: 0, max: 0, direction: "EW" };
      ewEntry.total += mp.ew;
      ewEntry.max += maxForBoard > 0 ? maxForBoard : 0;
      totals.set(ewId, ewEntry);
    }
  }

  const entries: RankEntry[] = [];
  for (const [pairNumber, pairData] of totals) {
    const percentage = pairData.max > 0
      ? ((pairData.total / pairData.max) * 100).toFixed(2)
      : "0.00";
    entries.push({
      pairNumber,
      direction: pairData.direction,
      totalMp: pairData.total,
      maxMp: pairData.max,
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
