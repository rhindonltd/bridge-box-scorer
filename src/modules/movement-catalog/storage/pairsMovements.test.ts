import { describe, it, expect } from "vitest";
import { generatePairsMovements } from "./pairsMovements";

describe("generatePairsMovements", () => {
  const movements = generatePairsMovements();

  it("generates at least one movement", () => {
    expect(movements.length).toBeGreaterThan(0);
  });

  it("each movement has a non-empty name", () => {
    for (const m of movements) {
      expect(m.name).toBeTruthy();
    }
  });

  it("each movement has valid table count", () => {
    for (const m of movements) {
      expect(m.tables).toBeGreaterThan(0);
      expect(m.tableData).toHaveLength(m.tables);
    }
  });

  it("each movement has a positive board count that is a multiple of boardsPerRound", () => {
    for (const m of movements) {
      expect(m.boards).toBeGreaterThan(0);
      expect(m.boards % m.boardsPerRound).toBe(0);
    }
  });

  it("each table has the correct number of rounds", () => {
    for (const m of movements) {
      for (const table of m.tableData) {
        expect(table.rounds).toHaveLength(m.rounds);
      }
    }
  });

  it("each round has PAIR participant fields (nsId and ewId)", () => {
    const m = movements[0];
    for (const table of m.tableData) {
      for (const round of table.rounds) {
        expect(round.participants).toHaveProperty("nsId");
        expect(round.participants).toHaveProperty("ewId");
      }
    }
  });

  it("each round has correct number of boards", () => {
    for (const m of movements) {
      for (const table of m.tableData) {
        for (const round of table.rounds) {
          expect(round.boards).toHaveLength(m.boardsPerRound);
        }
      }
    }
  });
});
