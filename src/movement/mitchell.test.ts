import { describe, it, expect } from "vitest";
import { generateMitchell } from "./mitchell";

describe("generateMitchell", () => {
  it("generates correct number of tables", () => {
    const result = generateMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 3,
    });
    expect(result.tables).toHaveLength(5);
  });

  it("generates correct number of rounds per table", () => {
    const result = generateMitchell({
      tables: 4,
      rounds: 4,
      boardsPerRound: 2,
    });
    for (const table of result.tables) {
      expect(table.rounds).toHaveLength(4);
    }
  });

  it("assigns correct boards per round", () => {
    const result = generateMitchell({
      tables: 3,
      rounds: 3,
      boardsPerRound: 3,
    });
    for (const table of result.tables) {
      for (const round of table.rounds) {
        expect(round.boards).toHaveLength(3);
      }
    }
  });

  it("NS pair stays at same table without arrow switch", () => {
    const result = generateMitchell({
      tables: 4,
      rounds: 4,
      boardsPerRound: 2,
    });
    // Table 1: NS pair should always be "1"
    for (const round of result.tables[0].rounds) {
      expect(round.participants.nsId).toBe("1");
    }
    // Table 3: NS pair should always be "3"
    for (const round of result.tables[2].rounds) {
      expect(round.participants.nsId).toBe("3");
    }
  });

  it("EW pairs move between tables", () => {
    const result = generateMitchell({
      tables: 4,
      rounds: 4,
      boardsPerRound: 2,
    });
    const ewPairs = result.tables[0].rounds.map(
      (r) => r.participants.ewId,
    );
    // All EW pairs at table 1 should be different
    const unique = new Set(ewPairs);
    expect(unique.size).toBe(4);
  });

  it("each EW pair plays at every table exactly once", () => {
    const result = generateMitchell({
      tables: 4,
      rounds: 4,
      boardsPerRound: 2,
    });
    // Collect all EW pairs at each table
    for (const table of result.tables) {
      const ewIds = table.rounds.map((r) => r.participants.ewId);
      expect(new Set(ewIds).size).toBe(4); // unique per table
    }
  });

  it("boards start at correct set numbers", () => {
    const result = generateMitchell({
      tables: 3,
      rounds: 3,
      boardsPerRound: 2,
    });
    // Each set should contain sequential boards:
    // Set 1: [1,2], Set 2: [3,4], Set 3: [5,6]
    const allBoards = result.tables
      .flatMap((t) => t.rounds.flatMap((r) => r.boards));
    expect(allBoards).toContain(1);
    expect(allBoards).toContain(6);
  });

  describe("arrow switch", () => {
    it("adds ewAdd offset to EW pairs when arrow switch is enabled", () => {
      const result = generateMitchell({
        tables: 4,
        rounds: 4,
        boardsPerRound: 2,
        arrowSwitchRounds: 1,
      });
      // Before arrow switch (rounds 1-3), NS should be table number
      const table1 = result.tables[0];
      expect(table1.rounds[0].participants.nsId).toBe("1");
      expect(table1.rounds[1].participants.nsId).toBe("1");
      expect(table1.rounds[2].participants.nsId).toBe("1");

      // In arrow switch round (round 4), NS and EW swap
      expect(table1.rounds[3].participants.ewId).toBe("1");
    });
  });

  describe("skip Mitchell", () => {
    it("throws for odd number of tables", () => {
      expect(() =>
        generateMitchell({
          tables: 5,
          rounds: 5,
          boardsPerRound: 2,
          skip: true,
        }),
      ).toThrow("Skip Mitchell cannot have an odd number of tables");
    });

    it("accepts even number of tables with skip", () => {
      const result = generateMitchell({
        tables: 6,
        rounds: 6,
        boardsPerRound: 2,
        skip: true,
      });
      expect(result.tables).toHaveLength(6);
    });
  });

  it("table numbers are sequential starting from 1", () => {
    const result = generateMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 3,
    });
    const tableNums = result.tables.map((t) => t.table);
    expect(tableNums).toEqual([1, 2, 3, 4, 5]);
  });
});
