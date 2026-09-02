import { describe, it, expect } from "vitest";
import {
  matchRecommendations,
  GeneratedMovementOption,
} from "./match-recommendations";
import { PairMovementSpec } from "@/db/movements/schema";

function dbSpec(overrides: Partial<PairMovementSpec>): PairMovementSpec {
  return {
    id: 1,
    name: "Movement",
    type: "0",
    tables: 3,
    boards: 24,
    boardsPerRound: 4,
    rounds: 6,
    missingPair: null,
    ...overrides,
  };
}

function generated(
  overrides: Partial<GeneratedMovementOption> = {},
): GeneratedMovementOption {
  return {
    name: "Standard Mitchell",
    family: "MITCHELL",
    spec: { tables: 3, rounds: 3, boardsPerRound: 8 },
    ...overrides,
  };
}

describe("matchRecommendations", () => {
  it("returns empty for a table count with no curated entries", () => {
    expect(matchRecommendations(999, [], [])).toEqual([]);
  });

  it("drops recommendations with no matching available movement", () => {
    // 3 tables recommends HOWELL (pref 1) and MITCHELL (pref 2). Provide only a
    // Mitchell generated option: the Howell recommendation must be dropped.
    const result = matchRecommendations(
      3,
      [generated({ spec: { tables: 3, rounds: 3, boardsPerRound: 8 } })],
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0].family).toBe("MITCHELL");
  });

  it("resolves a DB Howell candidate for the Howell recommendation", () => {
    const result = matchRecommendations(3, [], [
      dbSpec({ id: 7, name: "3 Table Howell", type: "2", rounds: 5, boardsPerRound: 5 }),
    ]);

    const howell = result.find((r) => r.family === "HOWELL");
    expect(howell).toBeDefined();
    expect(howell?.source).toBe("db");
    expect(howell?.specRef).toEqual({ source: "db", id: 7, type: "2" });
    expect(howell?.boardsPerPair).toBe(25); // 5 rounds * 5 boards
  });

  it("prefers a candidate matching the target rounds/boards profile", () => {
    // Two Howell DB specs for 3 tables: one matches target (5 rounds x 5),
    // one does not. matchRecommendations should pick the exact-profile one.
    const result = matchRecommendations(3, [], [
      dbSpec({ id: 1, name: "3 Table Howell short", type: "2", rounds: 4, boardsPerRound: 5 }),
      dbSpec({ id: 2, name: "3 Table Howell full", type: "2", rounds: 5, boardsPerRound: 5 }),
    ]);

    const howell = result.find((r) => r.family === "HOWELL");
    expect(howell?.specRef).toEqual({ source: "db", id: 2, type: "2" });
  });

  it("falls back to the first family candidate when no exact profile matches", () => {
    const result = matchRecommendations(3, [], [
      dbSpec({ id: 3, name: "3 Table Howell odd", type: "2", rounds: 4, boardsPerRound: 6 }),
    ]);

    const howell = result.find((r) => r.family === "HOWELL");
    expect(howell?.specRef).toEqual({ source: "db", id: 3, type: "2" });
    expect(howell?.boardsPerPair).toBe(24); // 4 * 6 from the actual candidate
  });

  it("orders results by boards-a-pair-plays descending", () => {
    // Provide both a Howell (25 boards) and a Mitchell (24 boards) for 3 tables.
    const result = matchRecommendations(
      3,
      [generated({ spec: { tables: 3, rounds: 3, boardsPerRound: 8 } })], // MITCHELL 24
      [dbSpec({ id: 9, name: "3 Table Howell", type: "2", rounds: 5, boardsPerRound: 5 })], // HOWELL 25
    );

    expect(result.map((r) => r.family)).toEqual(["HOWELL", "MITCHELL"]);
    expect(result.map((r) => r.boardsPerPair)).toEqual([25, 24]);
  });

  it("tie-breaks equal boards-per-pair by curated preference", () => {
    // For 10 tables MITCHELL (pref 1) and WEB (pref 2) both target 9x3 = 27.
    // Provide a generated Mitchell and a DB Web, both 9 rounds x 3 boards.
    const result = matchRecommendations(
      10,
      [
        generated({
          name: "Standard Mitchell",
          family: "MITCHELL",
          spec: { tables: 10, rounds: 9, boardsPerRound: 3 },
        }),
      ],
      [
        dbSpec({
          id: 20,
          name: "Web Mitchell 9 round SPECIAL",
          type: "0",
          tables: 10,
          rounds: 9,
          boardsPerRound: 3,
        }),
      ],
    );

    const web = result.find((r) => r.family === "WEB");
    const mitchell = result.find((r) => r.family === "MITCHELL");
    expect(web?.boardsPerPair).toBe(27);
    expect(mitchell?.boardsPerPair).toBe(27);
    // Equal boards -> Mitchell (preference 1) comes before Web (preference 2).
    expect(result.map((r) => r.family)).toEqual(["MITCHELL", "WEB"]);
  });

  it("carries pros/cons from the curated entry", () => {
    const result = matchRecommendations(3, [], [
      dbSpec({ id: 1, name: "3 Table Howell", type: "2", rounds: 5, boardsPerRound: 5 }),
    ]);
    const howell = result.find((r) => r.family === "HOWELL");
    expect(howell?.pros.length).toBeGreaterThan(0);
    expect(howell?.cons.length).toBeGreaterThan(0);
  });

  it("computes rounds from a skip Mitchell generated option", () => {
    // Skip Mitchell drops the last round: rounds - 1.
    const result = matchRecommendations(
      3,
      [
        generated({
          name: "Skip Mitchell",
          family: "MITCHELL",
          spec: { tables: 3, rounds: 3, boardsPerRound: 8, skip: true },
        }),
      ],
      [],
    );
    const mitchell = result.find((r) => r.family === "MITCHELL");
    expect(mitchell?.rounds).toBe(2); // 3 - 1
    expect(mitchell?.boardsPerPair).toBe(16); // 2 * 8
  });
});
