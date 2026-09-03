import { describe, it, expect } from "vitest";
import { recommendationsFromSpecMap } from "./spec-map-recommendations";
import { PairMovementSpec } from "@/db/movements/schema";

function dbSpec(overrides: Partial<PairMovementSpec>): PairMovementSpec {
  return {
    id: 1,
    name: "Movement",
    type: "0",
    tables: 14,
    boards: 24,
    boardsPerRound: 3,
    rounds: 8,
    missingPair: null,
    ...overrides,
  };
}

describe("recommendationsFromSpecMap", () => {
  it("returns nothing for a table count not in the snapshot", () => {
    expect(recommendationsFromSpecMap(1, [])).toEqual([]);
  });

  it("surfaces an even-table Web as a generated WEB movement needing two copies", () => {
    const movements = recommendationsFromSpecMap(14, []);

    const web = movements.find((m) => m.family === "WEB");
    expect(web).toBeDefined();
    expect(web?.source).toBe("generated");
    expect(web?.copies).toBe(2);
    expect(web?.specRef).toMatchObject({ source: "generated" });
    if (web?.specRef.source === "generated") {
      expect(web.specRef.spec).toMatchObject({ tables: 14, web: true });
    }
  });

  it("resolves an odd-table Web SPEC to a db movement when the seeded spec is present", () => {
    const seeded = dbSpec({
      id: 42,
      name: "[WEB8R] 13 Table Web Mitchell (8 rounds)",
      type: "0",
      tables: 13,
      rounds: 8,
    });

    const movements = recommendationsFromSpecMap(13, [seeded]);

    const web = movements.find((m) => m.family === "WEB");
    expect(web).toBeDefined();
    expect(web?.source).toBe("db");
    expect(web?.copies).toBe(2);
    expect(web?.specRef).toMatchObject({ source: "db", id: 42, type: "0" });
  });

  it("drops a SPEC descriptor when no seeded spec matches its name", () => {
    // 13 tables includes a seeded Web SPEC; with no pairSpecs it cannot resolve.
    const movements = recommendationsFromSpecMap(13, []);
    expect(movements.every((m) => m.source !== "db")).toBe(true);
  });

  it("orders movements by boards-a-pair-plays descending", () => {
    const movements = recommendationsFromSpecMap(14, []);
    const boards = movements.map((m) => m.boardsPerPair);
    const sorted = [...boards].sort((a, b) => b - a);
    expect(boards).toEqual(sorted);
  });

  it("de-duplicates a movement that appears under multiple boards buckets", () => {
    // The even-table Web appears under both the 24 and 27 boards buckets for
    // some table counts; it should be surfaced once per distinct spec.
    const movements = recommendationsFromSpecMap(18, []);
    const keys = movements.map(
      (m) => `${m.family}:${m.rounds}:${m.boardsPerRound}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("resolves a SPEC by (name, rounds), not name alone", () => {
    // Some names repeat at one table count with different round counts (e.g.
    // "[M109] Double Howell" is seeded at 8 tables with both 7 and 8 rounds).
    // The 8-table snapshot recommends "[M21] Double Weave Mitchell" at 8 rounds;
    // a same-named decoy at a different round count must NOT be matched.
    const target = dbSpec({
      id: 100,
      name: "[M21] Double Weave Mitchell",
      type: "0",
      tables: 8,
      rounds: 8,
    });
    const decoy = dbSpec({
      id: 200,
      name: "[M21] Double Weave Mitchell",
      type: "0",
      tables: 8,
      rounds: 7,
    });

    const movements = recommendationsFromSpecMap(8, [decoy, target]);

    const weave = movements.find(
      (m) => m.name === "[M21] Double Weave Mitchell",
    );
    expect(weave).toBeDefined();
    // Must pick the 8-round spec (id 100), never the 7-round decoy (id 200).
    expect(weave?.specRef).toMatchObject({ source: "db", id: 100 });
  });
});
