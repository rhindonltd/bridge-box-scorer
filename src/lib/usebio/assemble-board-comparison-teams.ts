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
  triangleTeamWins,
  teamMatchBoardWins,
  boardResult,
} from "@/scoring/swiss/team-match";
import { rank } from "@/scoring/overall/rank";
import { buildTravellerLine } from "./traveller-line";
import {
  UsebioBoardComparisonBoard,
  UsebioBoardComparisonMatch,
  UsebioBoardComparisonRankEntry,
  UsebioBoardComparisonScoring,
  UsebioBoardComparisonTeamsData,
  UsebioClub,
  UsebioTeam,
  UsebioTeamTravellerLine,
} from "./generate-usebio";

/** Points a single board is worth on the scoring's scale (BAM 1, PAB 2). */
function winPointsFor(scoring: UsebioBoardComparisonScoring): number {
  return scoring === "PAB" ? 2 : 1;
}

/**
 * Assemble the USEBIO board-comparison teams data (Board-a-Match or
 * Point-a-Board) from a game's teams and board rows.
 *
 * Mirrors `assembleSwissTeams`'s match reconstruction (the two home tables of a
 * match paired via the EW-seat encoding, shared through `groupTeamMatches`),
 * but scores by board comparison: each board's comparable result is a win, tie
 * or loss for the primary team decided on raw score, the opponent taking the
 * complement. The `scoring` scale (BAM 1 point per board, PAB 2) is applied
 * here so the emitted `teamPoints` / `teamScore` are already on the file's
 * scale. No cross-IMP points are emitted.
 */
export function assembleBoardComparisonTeams(
  game: BridgeGame,
  club: Club,
  teams: AssignedTeam[],
  boardRows: Board[],
  scoring: UsebioBoardComparisonScoring,
): UsebioBoardComparisonTeamsData {
  const usebioClub: UsebioClub = {
    name: club.name,
    clubNumber: club.clubNumber,
  };
  const winPoints = winPointsFor(scoring);

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

  const { matches, totals } = buildMatches(
    boardRows,
    numberByTeamId,
    winPoints,
  );
  const ranking = buildRanking(totals, numberByTeamId);

  const boardNumbers = new Set(boardRows.map((b) => b.boardNumber));

  return {
    kind: "BOARD_COMPARISON_TEAMS",
    scoring,
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
 * Reconstruct team matches and emit each match's per-board points (scaled by
 * `winPoints`), both rooms' traveller lines, and each team's points-won total.
 */
function buildMatches(
  boardRows: Board[],
  numberByTeamId: Map<string, string>,
  winPoints: number,
): { matches: UsebioBoardComparisonMatch[]; totals: Map<string, number> } {
  const totals = new Map<string, number>();
  const add = (teamId: string, points: number): void => {
    totals.set(teamId, (totals.get(teamId) ?? 0) + points);
  };

  const matches: UsebioBoardComparisonMatch[] = [];

  for (const match of groupTeamMatches(boardRows)) {
    const { homeTeamId, opponentTeamId } = match;
    const teamNumber = numberByTeamId.get(homeTeamId) ?? homeTeamId;
    const opposingNumber = numberByTeamId.get(opponentTeamId) ?? opponentTeamId;

    const { perBoard, won, boardsPlayed } = teamMatchBoardWins(match);

    const boards: UsebioBoardComparisonBoard[] = perBoard.map(
      ({ boardNumber, result }) => {
        const travellerLines: UsebioTeamTravellerLine[] = [];
        const homeRow = match.homeRowsByBoard.get(boardNumber);
        const awayRow = match.opponentRowsByBoard.get(boardNumber);
        // Primary team sat NS at its own home table, EW at the opponent's.
        if (homeRow) travellerLines.push(teamTravellerLine(homeRow, "NS"));
        if (awayRow) travellerLines.push(teamTravellerLine(awayRow, "EW"));
        // A board that isn't comparable yet scores 0/0 in the file; otherwise
        // scale the native board result (0/0.5/1) onto the file's points.
        const teamPoints = (result ?? 0) * winPoints;
        const opposingTeamPoints =
          result == null ? 0 : (1 - result) * winPoints;
        return { boardNumber, teamPoints, opposingTeamPoints, travellerLines };
      },
    );

    // groupTeamMatches keys entries off actual rows, so a reconstructed match
    // always has at least one board and these fallbacks cannot fire.
    /* v8 ignore start -- unreachable: a reconstructed match always has >=1 board */
    const startBoard = boards[0]?.boardNumber ?? 0;
    const endBoard = boards[boards.length - 1]?.boardNumber ?? 0;
    /* v8 ignore stop */

    // Match score is points won; the opponent won the complement of the played
    // boards (ties split), all scaled onto the file's points.
    const teamScore = won * winPoints;
    const opposingTeamScore = (boardsPlayed - won) * winPoints;
    add(homeTeamId, teamScore);
    add(opponentTeamId, opposingTeamScore);

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

  // Triangles: USEBIO has no three-way tag, so each triangle is written as its
  // three pairwise head-to-head MATCH nodes (same round) for board-level
  // detail. Those nodes are INFORMATIONAL — a triangle team's contribution to
  // its total is its CROSS board-comparison result (win/tie/loss vs BOTH other
  // tables), added once here (Option A: the export total agrees with the live
  // board-comparison standings).
  for (const triangle of groupTeamTriangles(boardRows)) {
    for (const sub of triangleSubMatches(triangle)) {
      const teamNumber = numberByTeamId.get(sub.homeTeamId) ?? sub.homeTeamId;
      const opposingNumber =
        numberByTeamId.get(sub.opponentTeamId) ?? sub.opponentTeamId;
      const { perBoard, won, boardsPlayed } = teamMatchBoardWins(sub);

      const boards: UsebioBoardComparisonBoard[] = perBoard.map(
        ({ boardNumber, result }) => {
          const travellerLines: UsebioTeamTravellerLine[] = [];
          const homeRow = sub.homeRowsByBoard.get(boardNumber);
          const awayRow = sub.opponentRowsByBoard.get(boardNumber);
          if (homeRow) travellerLines.push(teamTravellerLine(homeRow, "NS"));
          if (awayRow) travellerLines.push(teamTravellerLine(awayRow, "EW"));
          const teamPoints = (result ?? 0) * winPoints;
          const opposingTeamPoints =
            result == null ? 0 : (1 - result) * winPoints;
          return { boardNumber, teamPoints, opposingTeamPoints, travellerLines };
        },
      );

      /* v8 ignore start -- a reconstructed sub-match always has >=1 board */
      const startBoard = boards[0]?.boardNumber ?? 0;
      const endBoard = boards[boards.length - 1]?.boardNumber ?? 0;
      /* v8 ignore stop */

      // Head-to-head points on the node itself (informational, self-consistent).
      matches.push({
        round: sub.round,
        team: teamNumber,
        opposingTeam: opposingNumber,
        startBoard,
        endBoard,
        teamScore: won * winPoints,
        opposingTeamScore: (boardsPlayed - won) * winPoints,
        boards,
      });
    }

    // The authoritative per-team round result: the cross board-comparison
    // points (win/tie/loss vs both other tables, scaled), added once per team.
    const { perTeam } = triangleTeamWins(triangle);
    for (const team of perTeam) {
      add(team.teamId, team.won * winPoints);
    }
  }

  return { matches, totals };
}

function teamTravellerLine(
  row: Board,
  direction: string,
): UsebioTeamTravellerLine {
  const outcome = boardResult(row) ?? ("NP" as BoardOutcome);
  const line = buildTravellerLine(row.boardNumber, outcome, leadOf(row));
  return { direction, ...line };
}

/** Rank teams by total points won (highest first); ties share a place. */
function buildRanking(
  totals: Map<string, number>,
  numberByTeamId: Map<string, string>,
): UsebioBoardComparisonRankEntry[] {
  const ranked = rank(
    Array.from(totals.entries()).map(([teamId, totalWon]) => ({
      teamId,
      totalWon,
    })),
    (row) => row.totalWon,
  );

  return ranked.map((row) => ({
    number: numberByTeamId.get(row.teamId) ?? row.teamId,
    sectionId: sectionOf(row.teamId),
    totalWon: row.totalWon,
    place: row.rank,
  }));
}
