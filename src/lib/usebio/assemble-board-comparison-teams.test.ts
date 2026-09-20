import { describe, it, expect } from "vitest";
import { assembleBoardComparisonTeams } from "./assemble-board-comparison-teams";
import type { Board } from "@/db/games/tables/boards";
import type { AssignedTeam, Pair } from "@/model/participants";
import type { BridgeGame } from "@/db/game-index/schema";
import type { Club } from "@/db/system/schema";
import type { BoardOutcome } from "@/model/score";

const club: Club = { id: 1, name: "Test Club", clubNumber: "999" };

const game = {
  gameId: "g1",
  eventName: "Board-a-Match Teams",
  eventDate: "2024-11-18T00:00:00.000Z",
  gameType: "TEAMS",
  scoringType: "BAM",
  sectionName: "A",
} as BridgeGame;

function pair(seat: string, first: string): Pair {
  return {
    type: "PAIR",
    initialSeat: seat as Pair["initialSeat"],
    player1: { id: 1, firstName: first, lastName: "N", nationalId: null },
    player2: { id: 2, firstName: first, lastName: "S", nationalId: null },
  };
}

function team(homeTable: number, name: string): AssignedTeam {
  return {
    type: "TEAM",
    id: `A${homeTable}NS`,
    name,
    pair1: pair(`A${homeTable}NS`, `H${homeTable}`),
    pair2: pair(`A${homeTable}EW`, `A${homeTable}`),
  } as AssignedTeam;
}

function board(
  round: number,
  table: number,
  boardNumber: number,
  ns: string,
  ew: string,
  outcome: BoardOutcome | null,
): Board {
  return {
    section: "A",
    roundNumber: round,
    tableNumber: table,
    boardNumber,
    copy: "A",
    ns,
    ew,
    confirmedResult: outcome,
    confirmedLead: null,
    directorOverrideResult: null,
    directorOverrideLead: null,
    status: "CONFIRMED",
  } as Board;
}

describe("assembleBoardComparisonTeams — Board-a-Match (scale 1)", () => {
  const teams = [team(1, "Sharks"), team(2, "Dragons")];

  it("produces a board-comparison BAM file with the team roster", () => {
    const data = assembleBoardComparisonTeams(game, club, teams, [], "BAM");
    expect(data.kind).toBe("BOARD_COMPARISON_TEAMS");
    expect(data.scoring).toBe("BAM");
    expect(data.teams).toHaveLength(2);
    expect(data.teams[0]).toMatchObject({ teamNumber: "1", teamName: "Sharks" });
    expect(data.teams[0].players).toHaveLength(4);
  });

  it("emits per-board win/tie/loss points (0/0.5/1) from the home team's view", () => {
    // Board 1: team 1 (home NS) 4S= (420) beats team 2's home 3NT= (400) -> win.
    // Board 2: both 3NT= (400 v 400) -> tie.
    // Board 3: team 1 3NT= (400) loses to team 2's home 4S= (420) -> loss.
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
      board(1, 1, 2, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      board(1, 2, 2, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
      board(1, 1, 3, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      board(1, 2, 3, "A2NS", "A1EW", "4SN=" as BoardOutcome),
    ];

    const data = assembleBoardComparisonTeams(game, club, teams, boards, "BAM");
    const byBoard = new Map(
      data.matches[0].boards.map((b) => [b.boardNumber, b]),
    );

    expect(byBoard.get(1)).toMatchObject({ teamPoints: 1, opposingTeamPoints: 0 });
    expect(byBoard.get(2)).toMatchObject({
      teamPoints: 0.5,
      opposingTeamPoints: 0.5,
    });
    expect(byBoard.get(3)).toMatchObject({ teamPoints: 0, opposingTeamPoints: 1 });
    // Both rooms' direction-tagged traveller lines, no cross-imp fields.
    expect(byBoard.get(1)!.travellerLines.map((l) => l.direction)).toEqual([
      "NS",
      "EW",
    ]);
    expect(byBoard.get(1)!.travellerLines[0]).toMatchObject({
      contract: "4S",
      playedBy: "N",
    });
  });

  it("sets each team's match score to its boards won (complements sum to boards played)", () => {
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
      board(1, 1, 2, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      board(1, 2, 2, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];

    const data = assembleBoardComparisonTeams(game, club, teams, boards, "BAM");
    const match = data.matches[0];

    // Board 1 win + board 2 tie = 1.5 of 2; opponent gets 0.5.
    expect(match.teamScore).toBe(1.5);
    expect(match.opposingTeamScore).toBe(0.5);
    expect(match.teamScore + match.opposingTeamScore).toBe(2);
  });

  it("ranks teams by total boards won, highest first", () => {
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];

    const data = assembleBoardComparisonTeams(game, club, teams, boards, "BAM");
    expect(data.ranking[0]).toMatchObject({ number: "1", place: 1, totalWon: 1 });
    const dragons = data.ranking.find((r) => r.number === "2")!;
    expect(dragons.totalWon).toBe(0);
  });

  it("scores a not-yet-comparable board as 0/0 for both teams", () => {
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A1EW", null),
    ];

    const data = assembleBoardComparisonTeams(game, club, teams, boards, "BAM");
    const [boardEntry] = data.matches[0].boards;
    expect(boardEntry).toMatchObject({ teamPoints: 0, opposingTeamPoints: 0 });
    expect(data.matches[0].teamScore).toBe(0);
    expect(data.matches[0].opposingTeamScore).toBe(0);
  });
});

describe("assembleBoardComparisonTeams — Point-a-Board (scale 2)", () => {
  const teams = [team(1, "Sharks"), team(2, "Dragons")];
  const pabGame = { ...game, scoringType: "PAB" } as BridgeGame;

  it("produces a board-comparison PAB file tagged PAB", () => {
    const data = assembleBoardComparisonTeams(pabGame, club, teams, [], "PAB");
    expect(data.kind).toBe("BOARD_COMPARISON_TEAMS");
    expect(data.scoring).toBe("PAB");
  });

  it("doubles the per-board points: win 2 / tie 1 / loss 0", () => {
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
      board(1, 1, 2, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      board(1, 2, 2, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
      board(1, 1, 3, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      board(1, 2, 3, "A2NS", "A1EW", "4SN=" as BoardOutcome),
    ];

    const data = assembleBoardComparisonTeams(pabGame, club, teams, boards, "PAB");
    const byBoard = new Map(
      data.matches[0].boards.map((b) => [b.boardNumber, b]),
    );

    // Win -> 2/0, tie -> 1/1, loss -> 0/2.
    expect(byBoard.get(1)).toMatchObject({ teamPoints: 2, opposingTeamPoints: 0 });
    expect(byBoard.get(2)).toMatchObject({ teamPoints: 1, opposingTeamPoints: 1 });
    expect(byBoard.get(3)).toMatchObject({ teamPoints: 0, opposingTeamPoints: 2 });
  });

  it("scales the match score and ranking onto the 0/1/2 points", () => {
    // Board 1 win (2) + board 2 tie (1) = 3 of 4; opponent gets 1.
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
      board(1, 1, 2, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      board(1, 2, 2, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];

    const data = assembleBoardComparisonTeams(pabGame, club, teams, boards, "PAB");
    const match = data.matches[0];
    expect(match.teamScore).toBe(3);
    expect(match.opposingTeamScore).toBe(1);
    expect(data.ranking[0]).toMatchObject({ number: "1", place: 1, totalWon: 3 });
  });
});
