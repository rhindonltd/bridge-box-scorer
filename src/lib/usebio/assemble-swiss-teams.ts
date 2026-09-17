import { Board } from "@/db/games/tables/boards";
import { AssignedTeam, sectionOf } from "@/model/participants";
import { BridgeGame } from "@/db/game-index/schema";
import { Club } from "@/db/system/schema";
import { BoardOutcome } from "@/model/score";
import { Card } from "@/model/common";
import { calculateWbfVP } from "@/scoring/swiss/wbf-vp";
import {
  groupTeamMatches,
  teamMatchBoardImps,
  boardResult,
} from "@/scoring/swiss/team-match";
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
    const section = sectionOf(team.id);
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

  const { matches, totals } = buildUsebioMatches(boardRows, numberByTeamId);
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

function leadOf(row: Board): Card | null {
  return (row.directorOverrideLead ?? row.confirmedLead ?? null) as Card | null;
}

/**
 * Reconstruct team matches from board rows (via the shared `groupTeamMatches`)
 * and emit each match's per-board IMPs, both rooms' traveller lines, and the
 * integer VP split. Also accumulate per-team VP totals (keyed by team id) for
 * the ranking. Matches come out ordered by round, then section, then home
 * table — the order `groupTeamMatches` guarantees.
 */
function buildUsebioMatches(
  boardRows: Board[],
  numberByTeamId: Map<string, string>,
): { matches: UsebioSwissTeamsMatch[]; totals: Map<string, number> } {
  const totals = new Map<string, number>();
  const addVp = (teamId: string, vp: number): void => {
    totals.set(teamId, (totals.get(teamId) ?? 0) + vp);
  };

  const matches: UsebioSwissTeamsMatch[] = [];

  for (const match of groupTeamMatches(boardRows)) {
    const { homeTeamId, opponentTeamId } = match;
    const teamNumber = numberByTeamId.get(homeTeamId) ?? homeTeamId;
    const opposingNumber = numberByTeamId.get(opponentTeamId) ?? opponentTeamId;

    const { perBoard, margin, boardsPlayed } = teamMatchBoardImps(match);

    // Build the per-board USEBIO shapes: net IMPs (0 shown when not yet
    // comparable) plus a traveller line from each room that has played it.
    const boards: UsebioTeamBoard[] = perBoard.map(({ boardNumber, imps }) => {
      const travellerLines: UsebioTeamTravellerLine[] = [];
      const homeRow = match.homeRowsByBoard.get(boardNumber);
      const awayRow = match.opponentRowsByBoard.get(boardNumber);
      // Primary team sat NS at its own home table, EW at the opponent's.
      if (homeRow) travellerLines.push(teamTravellerLine(homeRow, "NS"));
      if (awayRow) travellerLines.push(teamTravellerLine(awayRow, "EW"));
      return { boardNumber, imps: imps ?? 0, travellerLines };
    });

    const startBoard = boards[0]?.boardNumber ?? 0;
    const endBoard = boards[boards.length - 1]?.boardNumber ?? 0;

    const { teamScore, opposingTeamScore } = matchVp(margin, boardsPlayed);
    addVp(homeTeamId, teamScore);
    addVp(opponentTeamId, opposingTeamScore);

    matches.push({
      round: match.round,
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

function teamTravellerLine(row: Board, direction: string): UsebioTeamTravellerLine {
  const outcome = boardResult(row) ?? ("NP" as BoardOutcome);
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
    const section = sectionOf(row.teamId);
    return {
      number: numberByTeamId.get(row.teamId) ?? row.teamId,
      sectionId: section,
      totalVP: row.totalVP,
      place: row.rank,
    };
  });
}
