import { Board } from "@/db/games/tables/boards";
import { AssignedTeam, parseSeat } from "@/model/participants";
import { BridgeGame } from "@/db/game-index/schema";
import { Club } from "@/db/system/schema";
import { BoardOutcome } from "@/model/score";
import { Card } from "@/model/common";
import { outcomeToScore, computeImps } from "@/scoring/traveller/common";
import { calculateWbfVP } from "@/scoring/swiss/wbf-vp";
import { rank } from "@/scoring/overall/rank";
import { buildTravellerLine } from "./traveller-line";
import {
  UsebioClub,
  UsebioSwissTeamsData,
  UsebioSwissTeamsMatch,
  UsebioTeam,
  UsebioTeamBoard,
  UsebioTeamTravellerLine,
  UsebioVpRankEntry,
} from "./generate-usebio";

/**
 * Assemble the USEBIO Swiss Teams data from a game's teams and board rows.
 *
 * A Swiss Teams match spans two home tables (open + closed room) sharing the
 * same boards: at team A's home its home pair sits NS and B's away pair sits
 * EW; at team B's home the mirror. A team's net result on a board is its NS
 * score at its own table minus the opponent's NS score at the other table; the
 * per-board net converts to IMPs and the match's summed IMP margin converts to
 * WHOLE-integer Victory Points on the WBF 20-point scale.
 *
 * This mirrors `calculateSwissTeamsVpOverall`'s match reconstruction (home
 * tables paired via the EW-seat encoding) but additionally emits the per-board
 * IMPs, both rooms' traveller lines and the per-match VP split the export
 * needs. Integer VPs are used throughout per the export's requirement.
 */
export function assembleSwissTeams(
  game: BridgeGame,
  club: Club,
  teams: AssignedTeam[],
  boardRows: Board[],
): UsebioSwissTeamsData {
  const usebioClub: UsebioClub = {
    name: club.name,
    clubNumber: club.clubNumber,
  };

  // Stable team numbers: 1..N in findTeams order (section then table). The
  // team id ("A1NS") maps to its USEBIO number and its display name/players.
  const numberByTeamId = new Map<string, string>();
  const usebioTeams: UsebioTeam[] = teams.map((team, i) => {
    const teamNumber = String(i + 1);
    numberByTeamId.set(team.id, teamNumber);
    const { section } = parseSeat(team.id as Parameters<typeof parseSeat>[0]);
    return {
      teamNumber,
      teamName: team.name,
      sectionId: section,
      players: [
        team.pair1.player1,
        team.pair1.player2,
        team.pair2.player1,
        team.pair2.player2,
      ],
    };
  });

  const { matches, totals } = buildMatches(boardRows, numberByTeamId);
  const ranking = buildRanking(totals, numberByTeamId);

  const boardNumbers = new Set(boardRows.map((b) => b.boardNumber));

  return {
    kind: "SWISS_TEAMS",
    club: usebioClub,
    eventName: game.eventName,
    eventDate: game.eventDate,
    sectionName: game.sectionName || "A",
    boards: boardNumbers.size,
    teams: usebioTeams,
    matches,
    ranking,
  };
}

/** The final result on a board: a director override wins over the confirmed. */
function boardResultOf(row: Board): BoardOutcome | null {
  return row.directorOverrideResult ?? row.confirmedResult ?? null;
}

function leadOf(row: Board): Card | null {
  return (row.directorOverrideLead ?? row.confirmedLead ?? null) as Card | null;
}

/** A team's stable id is its home NS seat (e.g. "A1NS"). */
function teamIdFor(section: string, homeTable: number): string {
  return `${section}${homeTable}NS`;
}

interface HomeEntry {
  section: string;
  round: number;
  homeTable: number;
  opponentTable: number;
  rows: Board[];
}

/**
 * Reconstruct team matches from board rows and emit each match's per-board
 * IMPs, both rooms' traveller lines, and the integer VP split. Also accumulate
 * per-team VP totals (keyed by team id) for the ranking.
 *
 * Matches are assembled by pairing each home table with its opponent's home
 * table (the EW seat encodes the opponent home table), processing each
 * unordered match once (when homeTable < opponentTable). Ordered by round then
 * section then home table.
 */
function buildMatches(
  boardRows: Board[],
  numberByTeamId: Map<string, string>,
): { matches: UsebioSwissTeamsMatch[]; totals: Map<string, number> } {
  // Index each home table's boards by (section, round, homeTable).
  const homeBoards = new Map<string, HomeEntry>();
  for (const row of boardRows) {
    if (row.status === "SIT_OUT") continue;
    const nsSeat = parseSeat(row.ns as Parameters<typeof parseSeat>[0]);
    const ewSeat = parseSeat(row.ew as Parameters<typeof parseSeat>[0]);
    const key = `${row.section}|${row.roundNumber}|${nsSeat.tableNumber}`;
    const entry =
      homeBoards.get(key) ??
      ({
        section: row.section,
        round: row.roundNumber,
        homeTable: nsSeat.tableNumber,
        opponentTable: ewSeat.tableNumber,
        rows: [],
      } satisfies HomeEntry);
    entry.rows.push(row);
    homeBoards.set(key, entry);
  }

  const totals = new Map<string, number>();
  const addVp = (teamId: string, vp: number): void => {
    totals.set(teamId, (totals.get(teamId) ?? 0) + vp);
  };

  const matches: UsebioSwissTeamsMatch[] = [];
  const processed = new Set<string>();

  const ordered = Array.from(homeBoards.values()).sort(
    (a, b) =>
      a.round - b.round ||
      (a.section < b.section ? -1 : a.section > b.section ? 1 : 0) ||
      a.homeTable - b.homeTable,
  );

  for (const entry of ordered) {
    const { section, round, homeTable, opponentTable } = entry;
    if (homeTable >= opponentTable) continue; // process the lower home once

    const key = `${section}|${round}|${homeTable}`;
    if (processed.has(key)) continue;
    processed.add(key);

    const other = homeBoards.get(`${section}|${round}|${opponentTable}`);

    const teamId = teamIdFor(section, homeTable);
    const opponentId = teamIdFor(section, opponentTable);
    const teamNumber = numberByTeamId.get(teamId) ?? teamId;
    const opposingNumber = numberByTeamId.get(opponentId) ?? opponentId;

    const { boards, margin, boardsPlayed, startBoard, endBoard } = buildBoards(
      entry,
      other,
    );

    const { teamScore, opposingTeamScore } = matchVp(margin, boardsPlayed);
    addVp(teamId, teamScore);
    addVp(opponentId, opposingTeamScore);

    matches.push({
      round,
      team: teamNumber,
      opposingTeam: opposingNumber,
      startBoard,
      endBoard,
      teamScore,
      opposingTeamScore,
      boards,
    });
  }

  return { matches, totals };
}

/**
 * Build a match's board list (with per-board IMPs from the primary team's
 * perspective and both rooms' traveller lines) plus the summed IMP margin and
 * the board range. The primary team sits NS at its own home table and EW at the
 * opponent's home table.
 */
function buildBoards(
  entry: HomeEntry,
  other: HomeEntry | undefined,
): {
  boards: UsebioTeamBoard[];
  margin: number;
  boardsPlayed: number;
  startBoard: number;
  endBoard: number;
} {
  const homeByBoard = new Map<number, Board>();
  for (const row of entry.rows) homeByBoard.set(row.boardNumber, row);
  const awayByBoard = new Map<number, Board>();
  for (const row of other?.rows ?? []) awayByBoard.set(row.boardNumber, row);

  const boardNumbers = Array.from(
    new Set([...homeByBoard.keys(), ...awayByBoard.keys()]),
  ).sort((a, b) => a - b);

  let margin = 0;
  let boardsPlayed = 0;
  const boards: UsebioTeamBoard[] = [];

  for (const boardNumber of boardNumbers) {
    const homeRow = homeByBoard.get(boardNumber);
    const awayRow = awayByBoard.get(boardNumber);

    const homeScore = homeRow ? scoreOf(homeRow) : null;
    const awayScore = awayRow ? scoreOf(awayRow) : null;

    // IMPs count only when BOTH rooms have a comparable score.
    let imps = 0;
    if (homeScore != null && awayScore != null) {
      imps = computeImps(homeScore - awayScore);
      margin += imps;
      boardsPlayed += 1;
    }

    const travellerLines: UsebioTeamTravellerLine[] = [];
    // Primary team sat NS at its own home table.
    if (homeRow) travellerLines.push(teamTravellerLine(homeRow, "NS"));
    // Primary team's away pair sat EW at the opponent's home table.
    if (awayRow) travellerLines.push(teamTravellerLine(awayRow, "EW"));

    boards.push({ boardNumber, imps, travellerLines });
  }

  return {
    boards,
    margin,
    boardsPlayed,
    startBoard: boardNumbers[0] ?? 0,
    endBoard: boardNumbers[boardNumbers.length - 1] ?? 0,
  };
}

/** The NS-perspective contract score for a row, or null when not comparable. */
function scoreOf(row: Board): number | null {
  const outcome = boardResultOf(row);
  return outcome != null ? outcomeToScore(row.boardNumber, outcome) : null;
}

function teamTravellerLine(row: Board, direction: string): UsebioTeamTravellerLine {
  const outcome = boardResultOf(row) ?? ("NP" as BoardOutcome);
  const line = buildTravellerLine(row.boardNumber, outcome, leadOf(row));
  return { direction, ...line };
}

/**
 * The integer VP split for a match given the primary team's net IMP margin
 * over the boards both rooms have scored. No comparable boards yet is a neutral
 * 10/10; otherwise the WBF 20-VP discrete (integer) scale, with the primary
 * team taking the winner's share when its margin is non-negative.
 */
function matchVp(
  margin: number,
  boardsPlayed: number,
): { teamScore: number; opposingTeamScore: number } {
  if (boardsPlayed === 0) {
    return { teamScore: NEUTRAL_VP_INT, opposingTeamScore: NEUTRAL_VP_INT };
  }
  const { winnerVP, loserVP } = calculateWbfVP(boardsPlayed, margin, "discrete");
  return margin >= 0
    ? { teamScore: winnerVP, opposingTeamScore: loserVP }
    : { teamScore: loserVP, opposingTeamScore: winnerVP };
}

/** Neutral VP for an unplayed match, as an integer (half the 20-point pool). */
const NEUTRAL_VP_INT = 10;

/** Rank teams by total VP (highest first), ties share a place. */
function buildRanking(
  totals: Map<string, number>,
  numberByTeamId: Map<string, string>,
): UsebioVpRankEntry[] {
  const ranked = rank(
    Array.from(totals.entries()).map(([teamId, totalVP]) => ({
      teamId,
      totalVP,
    })),
    (row) => row.totalVP,
  );

  return ranked.map((row) => {
    const { section } = parseSeat(row.teamId as Parameters<typeof parseSeat>[0]);
    return {
      number: numberByTeamId.get(row.teamId) ?? row.teamId,
      sectionId: section,
      totalVP: row.totalVP,
      place: row.rank,
    };
  });
}
