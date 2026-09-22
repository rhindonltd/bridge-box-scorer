import { Board } from "@/db/games/tables/boards";
import { AssignedTeam, sectionOf } from "@/model/participants";
import { BridgeGame } from "@/db/game-index/schema";
import { Club } from "@/db/system/schema";
import { BoardOutcome } from "@/model/score";
import { Card } from "@/model/common";
import {
  groupTeamMatches,
  groupTeamTriangles,
  triangleSubMatches,
  triangleTeamImps,
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
 * Assemble the USEBIO data for an aggregate-IMP teams event.
 *
 * Structurally this is a Swiss Teams file (same match reconstruction, same
 * per-board IMPs and traveller lines), but the match is scored on its raw net
 * IMP margin rather than converted to Victory Points, and the ranking is by
 * total net IMPs. The reused {@link UsebioSwissTeamsData} shape carries those
 * IMP figures in its `teamScore` / `totalVP` fields, and `matchScoringMethod`
 * is set to "IMPS" so the generator writes the correct MATCH_SCORING_METHOD.
 *
 * A team match credits the home team `+margin` and the opponent `−margin`. A
 * three-way triangle is written as three informational head-to-head MATCH nodes
 * (each showing its own IMP margin), while the authoritative per-team round
 * result added to the ranking total is the team's cross-IMP total — mirroring
 * how {@link import("./assemble-swiss-teams").assembleSwissTeams} treats
 * triangles for VP.
 */
export function assembleImpAggregateTeams(
  game: BridgeGame,
  club: Club,
  teams: AssignedTeam[],
  boardRows: Board[],
): UsebioSwissTeamsData {
  const usebioClub: UsebioClub = {
    name: club.name,
    clubNumber: club.clubNumber,
  };

  // Stable team numbers: 1..N in findTeams order (section then table).
  const numberByTeamId = new Map<string, string>();
  const usebioTeams: UsebioTeam[] = teams.map((team, i) => {
    const teamNumber = String(i + 1);
    numberByTeamId.set(team.id, teamNumber);
    return {
      teamNumber,
      teamName: team.name,
      sectionId: sectionOf(team.id),
      players: [
        team.pair1.player1,
        team.pair1.player2,
        team.pair2.player1,
        team.pair2.player2,
      ],
    };
  });

  const { matches, totals } = buildImpMatches(boardRows, numberByTeamId);
  const ranking = buildRanking(totals, numberByTeamId);

  const boardNumbers = new Set(boardRows.map((b) => b.boardNumber));

  return {
    kind: "SWISS_TEAMS",
    matchScoringMethod: "IMPS",
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

function teamTravellerLine(
  row: Board,
  direction: string,
): UsebioTeamTravellerLine {
  const outcome = boardResult(row) ?? ("NP" as BoardOutcome);
  const line = buildTravellerLine(row.boardNumber, outcome, leadOf(row));
  return { direction, ...line };
}

/**
 * Reconstruct team matches and emit each with its per-board IMPs, both rooms'
 * traveller lines, and the net IMP margin as TEAM_SCORE / OPPOSING_TEAM_SCORE.
 * Accumulate per-team total net IMPs (keyed by team id) for the ranking.
 */
function buildImpMatches(
  boardRows: Board[],
  numberByTeamId: Map<string, string>,
): { matches: UsebioSwissTeamsMatch[]; totals: Map<string, number> } {
  const totals = new Map<string, number>();
  const addImps = (teamId: string, imps: number): void => {
    totals.set(teamId, (totals.get(teamId) ?? 0) + imps);
  };

  const matches: UsebioSwissTeamsMatch[] = [];

  const emitMatch = (
    round: number,
    homeTeamId: string,
    opponentTeamId: string,
    perBoard: { boardNumber: number; imps: number | null }[],
    margin: number,
    homeRows: Map<number, Board>,
    awayRows: Map<number, Board>,
  ): void => {
    const teamNumber = numberByTeamId.get(homeTeamId) ?? homeTeamId;
    const opposingNumber = numberByTeamId.get(opponentTeamId) ?? opponentTeamId;

    const boards: UsebioTeamBoard[] = perBoard.map(({ boardNumber, imps }) => {
      const travellerLines: UsebioTeamTravellerLine[] = [];
      const homeRow = homeRows.get(boardNumber);
      const awayRow = awayRows.get(boardNumber);
      if (homeRow) travellerLines.push(teamTravellerLine(homeRow, "NS"));
      if (awayRow) travellerLines.push(teamTravellerLine(awayRow, "EW"));
      return { boardNumber, imps: imps ?? 0, travellerLines };
    });

    /* v8 ignore start -- a reconstructed match always has >=1 board */
    const startBoard = boards[0]?.boardNumber ?? 0;
    const endBoard = boards[boards.length - 1]?.boardNumber ?? 0;
    /* v8 ignore stop */

    matches.push({
      round,
      team: teamNumber,
      opposingTeam: opposingNumber,
      startBoard,
      endBoard,
      // The match's net IMP margin, from each team's perspective.
      teamScore: margin,
      opposingTeamScore: -margin,
      boards,
    });
  };

  for (const match of groupTeamMatches(boardRows)) {
    const { perBoard, margin } = teamMatchBoardImps(match);
    emitMatch(
      match.round,
      match.homeTeamId,
      match.opponentTeamId,
      perBoard,
      margin,
      match.homeRowsByBoard,
      match.opponentRowsByBoard,
    );
    // The home team's aggregate is +margin, the opponent's is -margin.
    addImps(match.homeTeamId, margin);
    addImps(match.opponentTeamId, -margin);
  }

  // Triangles: emit the three pairwise head-to-head MATCH nodes for board-level
  // detail (informational), and add each team's authoritative CROSS-IMP total
  // once to its ranking aggregate.
  for (const triangle of groupTeamTriangles(boardRows)) {
    for (const sub of triangleSubMatches(triangle)) {
      const { perBoard, margin } = teamMatchBoardImps(sub);
      emitMatch(
        sub.round,
        sub.homeTeamId,
        sub.opponentTeamId,
        perBoard,
        margin,
        sub.homeRowsByBoard,
        sub.opponentRowsByBoard,
      );
    }

    const { perTeam } = triangleTeamImps(triangle);
    for (const team of perTeam) {
      addImps(team.teamId, team.crossImps);
    }
  }

  return { matches, totals };
}

/** Rank teams by total net IMPs (highest first); ties share a place. */
function buildRanking(
  totals: Map<string, number>,
  numberByTeamId: Map<string, string>,
): UsebioVpRankEntry[] {
  const ranked = rank(
    Array.from(totals.entries()).map(([teamId, totalImps]) => ({
      teamId,
      totalImps,
    })),
    (row) => row.totalImps,
  );

  return ranked.map((row) => ({
    number: numberByTeamId.get(row.teamId) ?? row.teamId,
    sectionId: sectionOf(row.teamId),
    // The reused rank-entry shape names this field totalVP; here it carries the
    // team's total net IMPs (MATCH_SCORING_METHOD = IMPS).
    totalVP: row.totalImps,
    place: row.rank,
  }));
}
