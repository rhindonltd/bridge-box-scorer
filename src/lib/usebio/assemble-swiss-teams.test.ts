import { describe, it, expect } from "vitest";
import { assembleSwissTeams } from "./assemble-swiss-teams";
import type { Board } from "@/db/games/tables/boards";
import type { AssignedTeam, Pair } from "@/model/participants";
import type { BridgeGame } from "@/db/game-index/schema";
import type { Club } from "@/db/system/schema";
import type { BoardOutcome } from "@/model/score";

const club: Club = { id: 1, name: "Test Club", clubNumber: "999" };

const game = {
  gameId: "g1",
  eventName: "Swiss Teams",
  eventDate: "2024-11-18T00:00:00.000Z",
  gameType: "TEAMS",
  scoringType: "IMP_VP",
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
  const id = `A${homeTable}NS`;
  return {
    type: "TEAM",
    id,
    name,
    pair1: pair(`A${homeTable}NS`, `H${homeTable}`),
    pair2: pair(`A${homeTable}EW`, `A${homeTable}`),
  } as AssignedTeam;
}

/**
 * One board row. `ns`/`ew` are the seat ids; for a teams match, team 1's home
 * table (1) has ns=A1NS (its home pair) and ew=A2EW (team 2's away pair), and
 * team 2's home table (2) has ns=A2NS and ew=A1EW.
 */
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

describe("assembleSwissTeams", () => {
  const teams = [team(1, "Sharks"), team(2, "Dragons")];

  it("lists teams with number, name and four players in the roster", () => {
    const data = assembleSwissTeams(game, club, teams, []);

    expect(data.kind).toBe("SWISS_TEAMS");
    expect(data.teams).toHaveLength(2);
    expect(data.teams[0]).toMatchObject({
      teamNumber: "1",
      teamName: "Sharks",
      sectionId: "A",
    });
    expect(data.teams[0].players).toHaveLength(4);
    expect(data.teams[1].teamNumber).toBe("2");
  });

  it("builds one match per round pairing the two home tables", () => {
    // Round 1: team 1 home (table 1) A1NS vs A2EW; team 2 home (table 2)
    // A2NS vs A1EW. Same board played in both rooms.
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];

    const data = assembleSwissTeams(game, club, teams, boards);

    expect(data.matches).toHaveLength(1);
    const match = data.matches[0];
    expect(match.round).toBe(1);
    expect(match.team).toBe("1");
    expect(match.opposingTeam).toBe("2");
    expect(match.startBoard).toBe(1);
    expect(match.endBoard).toBe(1);
  });

  it("emits per-board net IMPs and both rooms' direction-tagged traveller lines", () => {
    // Team 1 (home NS, board 1): 4S= None-vul = 420. Team 2's home table
    // (team 1's away pair sits EW): 3NT= = 400. Net for team 1 = 420-400 = +20
    // -> IMPs(20) = 1.
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];

    const data = assembleSwissTeams(game, club, teams, boards);
    const [boardEntry] = data.matches[0].boards;

    expect(boardEntry.boardNumber).toBe(1);
    expect(boardEntry.imps).toBe(1);
    // Two rooms: team 1 NS at its own table, EW at the opponent's.
    expect(boardEntry.travellerLines.map((l) => l.direction)).toEqual([
      "NS",
      "EW",
    ]);
    expect(boardEntry.travellerLines[0]).toMatchObject({
      contract: "4S",
      playedBy: "N",
    });
  });

  it("splits an integer VP total of 20 with the winner taking the larger share", () => {
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];

    const data = assembleSwissTeams(game, club, teams, boards);
    const match = data.matches[0];

    expect(Number.isInteger(match.teamScore)).toBe(true);
    expect(Number.isInteger(match.opposingTeamScore)).toBe(true);
    expect(match.teamScore + match.opposingTeamScore).toBe(20);
    // Team 1 netted positive IMPs, so it wins the match.
    expect(match.teamScore).toBeGreaterThanOrEqual(match.opposingTeamScore);
  });

  it("ranks teams by total VP, highest first, with integer totals", () => {
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "6SN=" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];

    const data = assembleSwissTeams(game, club, teams, boards);

    expect(data.ranking[0].place).toBe(1);
    expect(data.ranking[0].number).toBe("1");
    expect(Number.isInteger(data.ranking[0].totalVP)).toBe(true);
  });

  it("scores an unplayed match as a neutral 10/10", () => {
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", null),
      board(1, 2, 1, "A2NS", "A1EW", null),
    ];

    const data = assembleSwissTeams(game, club, teams, boards);
    const match = data.matches[0];

    expect(match.teamScore).toBe(10);
    expect(match.opposingTeamScore).toBe(10);
  });

  it("defaults a blank event section name to 'A'", () => {
    const blankSection = { ...game, sectionName: "" } as BridgeGame;
    const data = assembleSwissTeams(blankSection, club, teams, []);
    expect(data.sectionName).toBe("A");
  });

  it("falls back to the raw team id when a match references an unknown team", () => {
    // No teams roster, so the reconstructed match ids are not in the number
    // map: both the match and the ranking fall back to the raw team id.
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];

    const data = assembleSwissTeams(game, club, [], boards);
    const match = data.matches[0];

    expect(match.team).toBe("A1NS");
    expect(match.opposingTeam).toBe("A2NS");
    // The ranking also uses the raw id fallback.
    expect(data.ranking.map((r) => r.number).sort()).toEqual(["A1NS", "A2NS"]);
  });

  it("emits a traveller line only for the room that has played a given board", () => {
    // Board 1 is played in both rooms; board 2 only at the primary team's own
    // home table, board 3 only at the opponent's home table.
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
      board(1, 1, 2, "A1NS", "A2EW", "3NTN=" as BoardOutcome), // home only
      board(1, 2, 3, "A2NS", "A1EW", "3NTN=" as BoardOutcome), // opponent only
    ];

    const data = assembleSwissTeams(game, club, teams, boards);
    const byBoard = new Map(
      data.matches[0].boards.map((b) => [b.boardNumber, b]),
    );

    // Board 2: only the home (NS) room's line present.
    expect(byBoard.get(2)!.travellerLines.map((l) => l.direction)).toEqual([
      "NS",
    ]);
    // Board 3: only the opponent (EW) room's line present.
    expect(byBoard.get(3)!.travellerLines.map((l) => l.direction)).toEqual([
      "EW",
    ]);
  });

  it("writes a triangle as three same-round match nodes with cross-IMP totals", () => {
    const triTeams = [team(1, "Sharks"), team(2, "Dragons"), team(3, "Owls")];
    // Triangle 1→2→3→1 on board 1 (None vul): table1 420, table2 400, table3 110.
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A3EW", "3NTN=" as BoardOutcome),
      board(1, 3, 1, "A3NS", "A1EW", "2SN=" as BoardOutcome),
    ];

    const data = assembleSwissTeams(game, club, triTeams, boards);

    // Three MATCH nodes, all round 1, covering the three pairings.
    expect(data.matches).toHaveLength(3);
    expect(data.matches.every((m) => m.round === 1)).toBe(true);
    expect(
      data.matches.map((m) => `${m.team}v${m.opposingTeam}`).sort(),
    ).toEqual(["1v2", "1v3", "2v3"]);

    // Totals are the cross-IMP VPs (integer): cross-IMPs 8, 6, -14 -> the two
    // above-field teams beat 10, the below-field team is under 10.
    const byNumber = new Map(data.ranking.map((r) => [r.number, r.totalVP]));
    expect(byNumber.get("1")!).toBeGreaterThan(10);
    expect(byNumber.get("2")!).toBeGreaterThan(10);
    expect(byNumber.get("3")!).toBeLessThan(10);
    // Team 1 (cross-IMP 8) outranks team 2 (6) outranks team 3 (-14).
    expect(byNumber.get("1")!).toBeGreaterThanOrEqual(byNumber.get("2")!);
    expect(byNumber.get("2")!).toBeGreaterThan(byNumber.get("3")!);
    expect(data.ranking[0].number).toBe("1");
  });

  it("keeps a triangle's cross-IMP total independent of the head-to-head node scores", () => {
    const triTeams = [team(1, "A"), team(2, "B"), team(3, "C")];
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A3EW", "3NTN=" as BoardOutcome),
      board(1, 3, 1, "A3NS", "A1EW", "2SN=" as BoardOutcome),
    ];

    const data = assembleSwissTeams(game, club, triTeams, boards);
    // The three head-to-head node scores do NOT drive the total (Option A):
    // team 1's total equals its cross-IMP VP, not the sum of its 1v2 + 1v3 node
    // scores. Assert the total sits on the WBF scale around the neutral 10.
    const t1 = data.ranking.find((r) => r.number === "1")!;
    expect(t1.totalVP).toBeGreaterThan(10);
    expect(t1.totalVP).toBeLessThanOrEqual(20);
  });

  it("awards the winner's VP to the opposing team on a negative margin", () => {
    // Primary team (home NS) does badly: 4S-3 at its own table while the
    // opponent's home table makes 3NT, so team 1's margin is negative.
    const boards = [
      board(1, 1, 1, "A1NS", "A2EW", "4SN-3" as BoardOutcome),
      board(1, 2, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];

    const data = assembleSwissTeams(game, club, teams, boards);
    const match = data.matches[0];

    expect(match.teamScore + match.opposingTeamScore).toBe(20);
    expect(match.opposingTeamScore).toBeGreaterThan(match.teamScore);
  });
});
