import { describe, expect, it } from "vitest";
import { generateStandardMitchell } from "./standard-mitchell";

describe("generateStandardMitchell", () => {
  it("generates the correct number of tables", () => {
    const result = generateStandardMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
    });

    expect(result.tables).toHaveLength(5);
  });

  it("generates the correct number of rounds at every table", () => {
    const result = generateStandardMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
    });

    for (const table of result.tables) {
      expect(table.rounds).toHaveLength(5);
    }
  });

  it("generates the correct boards for each round", () => {
    const result = generateStandardMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
    });

    expect(result.tables[0].rounds.map((r) => r.boards)).toEqual([
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
      [11, 12, 13, 14, 15],
      [16, 17, 18, 19, 20],
      [21, 22, 23, 24, 25],
    ]);
  });

  it("moves EW one table each round", () => {
    const result = generateStandardMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
    });

    const table1 = result.tables.find((t) => t.table === 1);

    expect(table1?.rounds.map((r) => r.participants.ewId)).toEqual([
      "1EW",
      "5EW",
      "4EW",
      "3EW",
      "2EW",
    ]);
  });

  it("keeps NS at the same table", () => {
    const result = generateStandardMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
    });

    for (const table of result.tables) {
      expect(table.rounds.map((r) => r.participants.nsId)).toEqual(
        Array(5).fill(`${table.table}NS`),
      );
    }
  });

  it("gives every table a unique EW opponent in every round", () => {
    const result = generateStandardMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
    });

    for (const table of result.tables) {
      const opponents = table.rounds.map((r) => r.participants.ewId);

      expect(new Set(opponents).size).toBe(5);
    }
  });

  it("gives every table a different board set in every round", () => {
    const result = generateStandardMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
    });

    for (const table of result.tables) {
      const boardSets = table.rounds.map((r) => r.boards.join(","));

      expect(new Set(boardSets).size).toBe(5);
    }
  });

  it("covers every board exactly once across the movement", () => {
    const result = generateStandardMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
    });

    const allBoards = result.tables.flatMap((table) =>
      table.rounds.flatMap((round) => round.boards),
    );

    const expectedBoardCount = 5 * 5 * 5;

    expect(allBoards).toHaveLength(expectedBoardCount);

    const boardCounts = new Map<number, number>();

    for (const board of allBoards) {
      boardCounts.set(board, (boardCounts.get(board) ?? 0) + 1);
    }

    for (const count of boardCounts.values()) {
      expect(count).toBe(5);
    }
  });

  it("supports a different number of boards per round", () => {
    const result = generateStandardMitchell({
      tables: 6,
      rounds: 6,
      boardsPerRound: 3,
    });

    expect(result.tables).toHaveLength(6);

    for (const table of result.tables) {
      expect(table.rounds).toHaveLength(6);

      for (const round of table.rounds) {
        expect(round.boards).toHaveLength(3);
      }
    }
  });

  it("does not give a pair the same opponent twice", () => {
    const result = generateStandardMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
    });

    for (const table of result.tables) {
      const opponents = table.rounds.map((r) => r.participants.ewId);

      expect(new Set(opponents).size).toBe(opponents.length);
    }
  });

  it("rejects a movement with more rounds than tables", () => {
    expect(() =>
      generateStandardMitchell({
        tables: 5,
        rounds: 6,
        boardsPerRound: 3,
      }),
    ).toThrow("A Mitchell cannot have more rounds than tables");
  });

  it("rejects a movement with only one round", () => {
    expect(() =>
      generateStandardMitchell({
        tables: 5,
        rounds: 1,
        boardsPerRound: 5,
      }),
    ).toThrow("A Mitchell must have at least 2 rounds");
  });

  it("each NS pair plays every EW pair exactly once", () => {
    const result = generateStandardMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
    });

    for (const table of result.tables) {
      const opponents = table.rounds.map((round) => round.participants.ewId);

      expect(opponents).toEqual([
        `${table.table}EW`,
        `${((table.table - 2 + 5) % 5) + 1}EW`,
        `${((table.table - 3 + 5) % 5) + 1}EW`,
        `${((table.table - 4 + 5) % 5) + 1}EW`,
        `${((table.table - 5 + 5) % 5) + 1}EW`,
      ]);
    }
  });

  it("uses a single pair numbering scheme for a 1-winner movement", () => {
    const result = generateStandardMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
      arrowSwitchRounds: 2,
    });

    const table1 = result.tables.find((table) => table.table === 1);

    expect(
      table1?.rounds
        .slice(0, 3)
        .map((round) => [round.participants.nsId, round.participants.ewId]),
    ).toEqual([
      ["1", "6"],
      ["1", "10"],
      ["1", "9"],
    ]);

    expect(
      table1?.rounds
        .slice(3)
        .map((round) => [round.participants.nsId, round.participants.ewId]),
    ).toEqual([
      ["8", "1"],
      ["7", "1"],
    ]);
  });
});
