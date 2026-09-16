import { describe, it, expect } from "vitest";
import { assembleSwissPairs } from "./assemble-swiss-pairs";
import type { Board } from "@/db/games/tables/boards";
import type { Pair } from "@/model/participants";
import type { BridgeGame } from "@/db/game-index/schema";
import type { Club } from "@/db/system/schema";
import type { BoardOutcome } from "@/model/score";
import type { Card } from "@/model/common";

const club: Club = { id: 1, name: "Test Club", clubNumber: "999" };

const game = {
  gameId: "g1",
  eventName: "Swiss Pairs",
  eventDate: "2024-11-18T00:00:00.000Z",
  gameType: "PAIRS",
  scoringType: "IMP",
  sectionName: "A",
} as BridgeGame;

function pair(seat: string, first: string): Pair {
  return {
    type: "PAIR",
    initialSeat: seat as Pair["initialSeat"],
    player1: { id: 1, firstName: first, lastName: "One", nationalId: null },
    player2: { id: 2, firstName: first, lastName: "Two", nationalId: null },
  };
}

function board(
  round: number,
  table: number,
  boardNumber: number,
  ns: string,
  ew: string,
  outcome: BoardOutcome | null,
  lead: Card | null = null,
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
    confirmedLead: lead,
    directorOverrideResult: null,
    directorOverrideLead: null,
    status: "CONFIRMED",
  } as Board;
}

describe("assembleSwissPairs", () => {
  it("emits SWISS_PAIRS data with a global pair roster", () => {
    const pairs = [pair("A1NS", "Al"), pair("A1EW", "Cy")];
    const boards = [board(1, 1, 1, "A1NS", "A1EW", "3NTN=" as BoardOutcome)];

    const data = assembleSwissPairs(game, club, pairs, boards);

    expect(data.kind).toBe("SWISS_PAIRS");
    expect(data.pairs.map((p) => p.pairNumber)).toEqual(["A1NS", "A1EW"]);
    expect(data.pairs[0].direction).toBe("N");
    expect(data.pairs[1].direction).toBe("E");
  });

  it("builds one match per (round, table) with the boards' traveller lines", () => {
    const pairs = [pair("A1NS", "Al"), pair("A1EW", "Cy")];
    const boards = [
      board(1, 1, 1, "A1NS", "A1EW", "3NTN+1" as BoardOutcome, "HK"),
      board(1, 1, 2, "A1NS", "A1EW", "4SE-1" as BoardOutcome),
    ];

    const data = assembleSwissPairs(game, club, pairs, boards);

    expect(data.matches).toHaveLength(1);
    const match = data.matches[0];
    expect(match.round).toBe(1);
    expect(match.nsPairNumber).toBe("A1NS");
    expect(match.ewPairNumber).toBe("A1EW");
    expect(match.boards.map((b) => b.boardNumber)).toEqual([1, 2]);
    expect(match.boards[0]).toMatchObject({
      contract: "3NT",
      playedBy: "N",
      lead: "HK",
      tricks: "10",
    });
  });

  it("splits an integer VP total of 20 across the two pairs of a match", () => {
    const pairs = [pair("A1NS", "Al"), pair("A1EW", "Cy")];
    // NS makes a vulnerable game; EW go down: NS should win the match.
    const boards = [board(1, 1, 1, "A1NS", "A1EW", "4SN+1" as BoardOutcome)];

    const data = assembleSwissPairs(game, club, pairs, boards);
    const match = data.matches[0];

    expect(Number.isInteger(match.nsScore)).toBe(true);
    expect(Number.isInteger(match.ewScore)).toBe(true);
    expect(match.nsScore + match.ewScore).toBe(20);
    expect(match.nsScore).toBeGreaterThanOrEqual(match.ewScore);
  });

  it("scores an unplayed match as a neutral 10/10", () => {
    const pairs = [pair("A1NS", "Al"), pair("A1EW", "Cy")];
    const boards = [board(1, 1, 1, "A1NS", "A1EW", null)];

    const data = assembleSwissPairs(game, club, pairs, boards);
    const match = data.matches[0];

    expect(match.nsScore).toBe(10);
    expect(match.ewScore).toBe(10);
  });

  it("ranks pairs by total VP across rounds, highest first", () => {
    const pairs = [
      pair("A1NS", "Al"),
      pair("A1EW", "Cy"),
      pair("A2NS", "Ed"),
      pair("A2EW", "Gu"),
    ];
    const boards = [
      // Round 1, table 1: A1NS wins big.
      board(1, 1, 1, "A1NS", "A1EW", "6SN=" as BoardOutcome),
      // Round 1, table 2: a flat board (both pairs near average).
      board(1, 2, 2, "A2NS", "A2EW", "2NTN=" as BoardOutcome),
    ];

    const data = assembleSwissPairs(game, club, pairs, boards);

    expect(data.ranking[0].place).toBe(1);
    // The winning NS pair from table 1 should top the ranking.
    expect(data.ranking[0].number).toBe("A1NS");
    expect(data.ranking[0].totalVP).toBeGreaterThanOrEqual(
      data.ranking[data.ranking.length - 1].totalVP,
    );
  });

  it("skips SIT_OUT rows when building matches", () => {
    const pairs = [pair("A1NS", "Al"), pair("A1EW", "Cy")];
    const boards = [
      { ...board(1, 1, 1, "A1NS", "A1EW", null), status: "SIT_OUT" } as Board,
    ];

    const data = assembleSwissPairs(game, club, pairs, boards);
    expect(data.matches).toHaveLength(0);
  });
});
