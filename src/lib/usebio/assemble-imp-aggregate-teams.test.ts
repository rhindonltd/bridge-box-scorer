import { describe, it, expect } from "vitest";
import { assembleImpAggregateTeams as assembleImpAggregateTeamsImpl } from "./assemble-imp-aggregate-teams";
import { teamMatchStructureFromRows } from "@/scoring/swiss/team-match-test-structure";
import type { Board } from "@/db/games/tables/boards";
import type { AssignedTeam, Pair } from "@/model/participants";
import type { BridgeGame } from "@/db/game-index/schema";
import type { Club } from "@/db/system/schema";
import type { BoardOutcome } from "@/model/score";

function assemble(
  g: BridgeGame,
  teams: AssignedTeam[],
  boardRows: Board[],
  excluded: ReadonlySet<string> = new Set(),
) {
  return assembleImpAggregateTeamsImpl(
    g,
    club,
    "NORMAL_CLUB",
    teams,
    boardRows,
    teamMatchStructureFromRows(boardRows),
    excluded,
  );
}

const club: Club = { id: 1, name: "Test Club", clubNumber: "999" };

const game = {
  gameId: "g1",
  eventName: "Aggregate IMP Teams",
  eventDate: "2024-11-18T00:00:00.000Z",
  gameType: "TEAMS",
  scoringType: "IMP",
  sectionName: "A",
} as unknown as BridgeGame;

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
  extra: Partial<Board> = {},
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
    matchId: 1,
    ...extra,
  } as Board;
}

const o = (s: string) => s as BoardOutcome;

describe("assembleImpAggregateTeams", () => {
  const teams = [team(1, "Sharks"), team(2, "Dragons")];

  it("produces an IMPS Swiss-teams file with the roster and club", () => {
    const data = assemble(game, teams, []);
    expect(data.kind).toBe("SWISS_TEAMS");
    expect(data.matchScoringMethod).toBe("IMPS");
    expect(data.club).toEqual({ name: "Test Club", clubNumber: "999" });
    expect(data.teams).toHaveLength(2);
    expect(data.teams[0]).toMatchObject({
      teamNumber: "1",
      teamName: "Sharks",
    });
    expect(data.teams[0].pairs).toHaveLength(2);
    expect(data.boards).toBe(0);
    expect(data.matches).toEqual([]);
    expect(data.ranking).toEqual([]);
  });

  it("defaults an empty section name to A", () => {
    const data = assemble(
      { ...game, sectionName: "" } as unknown as BridgeGame,
      teams,
      [],
    );
    expect(data.sectionName).toBe("A");
  });

  it("scores a match on its net IMP margin and ranks by total IMPs", () => {
    // Board 1: team 1 4S= (420) v team 2 3NT= (400) -> +1 IMP to team 1.
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", o("4SN="), {
        confirmedLead: "SA" as never,
      }),
      board(1, 2, 1, "A2NS", "A1EW", o("3NTN="), {
        directorOverrideLead: "HK" as never,
      }),
    ];
    const data = assemble(game, teams, boards);
    expect(data.boards).toBe(1);
    expect(data.matches).toHaveLength(1);
    const m = data.matches[0];
    expect(m).toMatchObject({
      round: 1,
      team: "1",
      opposingTeam: "2",
      startBoard: 1,
      endBoard: 1,
      teamScore: 1,
      opposingTeamScore: -1,
    });
    expect(m.boards[0].imps).toBe(1);
    expect(m.boards[0].travellerLines.map((l) => l.direction)).toEqual([
      "NS",
      "EW",
    ]);
    expect(data.ranking).toEqual([
      expect.objectContaining({ number: "1", totalVP: 1, place: 1 }),
      expect.objectContaining({ number: "2", totalVP: -1, place: 2 }),
    ]);
  });

  it("writes a not-yet-comparable board as 0 IMPs with a no-play line", () => {
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", o("4SN=")),
      board(1, 2, 1, "A2NS", "A1EW", null),
    ];
    const data = assemble(game, teams, boards);
    const b = data.matches[0].boards[0];
    expect(b.imps).toBe(0);
    expect(b.travellerLines).toHaveLength(2);
    expect(data.matches[0].teamScore).toBe(0);
  });

  it("omits a room's traveller line when that room has no row for the board", () => {
    // Board 1 played in both rooms; board 2 only in the home room.
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", o("4SN=")),
      board(1, 2, 1, "A2NS", "A1EW", o("3NTN=")),
      board(1, 1, 2, "A1NS", "A2EW", o("3NTN=")),
    ];
    const data = assemble(game, teams, boards);
    const b2 = data.matches[0].boards.find((b) => b.boardNumber === 2);
    expect(b2?.travellerLines.map((l) => l.direction)).toEqual(["NS"]);
  });

  it("omits the home line and falls back to the raw id for a home team off the roster", () => {
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", o("4SN=")),
      board(1, 2, 1, "A2NS", "A1EW", o("3NTN=")),
      board(1, 2, 2, "A2NS", "A1EW", o("3NTN=")),
    ];
    const data = assemble(game, [teams[1]], boards);
    expect(data.matches[0].team).toBe("A1NS");
    const b2 = data.matches[0].boards.find((b) => b.boardNumber === 2);
    expect(b2?.travellerLines.map((l) => l.direction)).toEqual(["EW"]);
  });

  it("falls back to the raw team id for a team missing from the roster", () => {
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", o("4SN=")),
      board(1, 2, 1, "A2NS", "A1EW", o("3NTN=")),
    ];
    // Only team 1 is on the roster; team 2's id is used verbatim.
    const data = assemble(game, [teams[0]], boards);
    expect(data.matches[0].opposingTeam).toBe("A2NS");
    expect(data.ranking.map((r) => r.number)).toEqual(["1", "A2NS"]);
  });

  it("drops a without-standing team from the ranking but keeps its match", () => {
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", o("4SN=")),
      board(1, 2, 1, "A2NS", "A1EW", o("3NTN=")),
    ];
    const data = assemble(game, teams, boards, new Set(["A2NS"]));
    expect(data.matches).toHaveLength(1);
    expect(data.ranking).toHaveLength(1);
    expect(data.ranking[0]).toMatchObject({ number: "1", place: 1 });
  });

  it("writes a SHORT triple as three head-to-head matches summing per team", () => {
    const triTeams = [team(1, "Sharks"), team(2, "Dragons"), team(3, "Owls")];
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", o("4SN=")),
      board(1, 2, 1, "A2NS", "A1EW", o("3NTN=")),
      board(1, 2, 2, "A2NS", "A3EW", o("4SN=")),
      board(1, 3, 2, "A3NS", "A2EW", o("3NTN=")),
      board(1, 3, 3, "A3NS", "A1EW", o("3NTN=")),
      board(1, 1, 3, "A1NS", "A3EW", o("4SN=")),
    ];
    const data = assemble(game, triTeams, boards);
    expect(data.matches).toHaveLength(3);
    const total = new Map(data.ranking.map((r) => [r.number, r.totalVP]));
    expect(total.get("1")).toBe(2);
    expect(total.get("2")).toBe(0);
    expect(total.get("3")).toBe(-2);
  });
});
