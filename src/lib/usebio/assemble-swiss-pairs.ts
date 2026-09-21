import { Board } from "@/db/games/tables/boards";
import { Pair } from "@/model/participants";
import { BridgeGame } from "@/db/game-index/schema";
import { Club } from "@/db/system/schema";
import { BoardOutcome } from "@/model/score";
import { Card } from "@/model/common";
import { scoreIMP } from "@/scoring/traveller/pair/imp";
import { calculateWbfVP } from "@/scoring/swiss/wbf-vp";
import { compareByRoundSectionTable } from "@/scoring/swiss/team-match";
import { rank } from "@/scoring/overall/rank";
import { buildTravellerLine } from "./traveller-line";
import {
  UsebioClub,
  UsebioPair,
  UsebioSwissPairsData,
  UsebioSwissPairsMatch,
  UsebioVpRankEntry,
} from "./generate-usebio";

/**
 * Assemble the USEBIO Swiss Pairs data from a game's pairs and board rows.
 *
 * A Swiss round is one head-to-head match per table over a set of boards. We
 * bucket boards by (section, round, table), then for each match convert the net
 * IMP margin over its scored boards to WHOLE-integer Victory Points on the WBF
 * 20-point scale (the winner takes `winnerVP`, the other `loserVP`). A pair's
 * ranking total is the sum of its per-round match VPs.
 *
 * This mirrors `calculateSwissVpOverall` but keeps the per-match NS/EW split
 * (which the overall standings collapse away) so the export can emit each
 * MATCH's NS_SCORE/EW_SCORE. Integer VPs are used throughout per the export's
 * requirement.
 */
export function assembleSwissPairs(
  game: BridgeGame,
  club: Club,
  pairs: Pair[],
  boardRows: Board[],
): UsebioSwissPairsData {
  const usebioClub: UsebioClub = {
    name: club.name,
    clubNumber: club.clubNumber,
  };

  const usebioPairs: UsebioPair[] = pairs.map((pair) => ({
    pairNumber: pair.initialSeat,
    direction: pair.initialSeat.endsWith("NS") ? "N" : "E",
    player1: pair.player1,
    player2: pair.player2,
  }));

  const { matches, totals } = buildMatches(boardRows);
  const ranking = buildRanking(totals);

  const boardNumbers = new Set(boardRows.map((b) => b.boardNumber));

  return {
    kind: "SWISS_PAIRS",
    club: usebioClub,
    eventName: game.eventName,
    eventDate: game.eventDate,
    sectionName: game.sectionName || "A",
    boards: boardNumbers.size,
    pairs: usebioPairs,
    matches,
    ranking,
  };
}

/** The final result on a board: a director override wins over the confirmed. */
function boardResultOf(row: Board): BoardOutcome | null {
  return row.directorOverrideResult ?? row.confirmedResult ?? null;
}

/**
 * Group board rows into per-(section, round, table) matches, emitting each
 * match's traveller lines and integer VP split, and accumulating per-pair VP
 * totals for the ranking. Matches are ordered by round then section then table.
 */
function buildMatches(boardRows: Board[]): {
  matches: UsebioSwissPairsMatch[];
  totals: Map<string, number>;
} {
  type MatchGroup = {
    section: string;
    round: number;
    table: number;
    nsId: string;
    ewId: string;
    rows: Board[];
  };

  const groups = new Map<string, MatchGroup>();
  for (const row of boardRows) {
    if (row.status === "SIT_OUT") continue;
    const key = `${row.section}|${row.roundNumber}|${row.tableNumber}`;
    const group =
      groups.get(key) ??
      ({
        section: row.section,
        round: row.roundNumber,
        table: row.tableNumber,
        nsId: row.ns,
        ewId: row.ew,
        rows: [],
      } satisfies MatchGroup);
    group.rows.push(row);
    groups.set(key, group);
  }

  const ordered = Array.from(groups.values()).sort((a, b) =>
    compareByRoundSectionTable(a, b),
  );

  const totals = new Map<string, number>();
  const addVp = (pairId: string, vp: number): void => {
    totals.set(pairId, (totals.get(pairId) ?? 0) + vp);
  };

  const matches: UsebioSwissPairsMatch[] = ordered.map((group) => {
    const { nsScore, ewScore } = matchVp(group.nsId, group.ewId, group.rows);
    addVp(group.nsId, nsScore);
    addVp(group.ewId, ewScore);

    const boards = group.rows
      .slice()
      .sort((a, b) => a.boardNumber - b.boardNumber)
      .map((row) => {
        const outcome = boardResultOf(row) ?? ("NP" as BoardOutcome);
        const lead = (row.directorOverrideLead ??
          row.confirmedLead ??
          null) as Card | null;
        const line = buildTravellerLine(row.boardNumber, outcome, lead);
        return { boardNumber: row.boardNumber, ...line };
      });

    return {
      round: group.round,
      nsPairNumber: group.nsId,
      ewPairNumber: group.ewId,
      nsScore,
      ewScore,
      boards,
    };
  });

  return { matches, totals };
}

/**
 * The integer VP split for one match: sum per-board IMPs across the scored
 * boards to a net margin, then convert on the WBF 20-VP discrete (integer)
 * scale. A match with no scored boards yet is a neutral 10/10.
 */
function matchVp(
  nsId: string,
  ewId: string,
  rows: Board[],
): { nsScore: number; ewScore: number } {
  const scored = rows.filter((r) => boardResultOf(r) != null);
  if (scored.length === 0) return { nsScore: 10, ewScore: 10 };

  let nsImps = 0;
  let ewImps = 0;
  for (const row of scored) {
    const outcome = boardResultOf(row)!;
    const [line] = scoreIMP(row.boardNumber, [{ nsId, ewId, outcome }]);
    nsImps += line.nsImps;
    ewImps += line.ewImps;
  }

  const margin = nsImps - ewImps;
  const { winnerVP, loserVP } = calculateWbfVP(
    scored.length,
    margin,
    "discrete",
  );
  return margin >= 0
    ? { nsScore: winnerVP, ewScore: loserVP }
    : { nsScore: loserVP, ewScore: winnerVP };
}

/** Rank pairs by total VP (highest first), ties share a place. */
function buildRanking(totals: Map<string, number>): UsebioVpRankEntry[] {
  const ranked = rank(
    Array.from(totals.entries()).map(([pairId, totalVP]) => ({
      pairId,
      totalVP,
    })),
    (row) => row.totalVP,
  );

  return ranked.map((row) => ({
    number: row.pairId,
    sectionId: sectionOf(row.pairId),
    totalVP: row.totalVP,
    place: row.rank,
  }));
}

/** Section letter from a section-qualified seat (e.g. "A1NS" -> "A"). */
function sectionOf(pairId: string): string {
  const match = /^([A-Z]+)\d+(?:NS|EW)$/.exec(pairId);
  return match ? match[1] : "A";
}
