import { describe, it, expect } from "vitest";
import {
  applyMitchellSitOut,
  generateStandardMitchellWithSitOut,
} from "./sit-out";
import { generateStandardMitchell } from "./standard-mitchell";

const spec = { tables: 5, rounds: 5, boardsPerRound: 3 };

describe("applyMitchellSitOut", () => {
  it("removes boards from every round where the phantom sits (EW sit-out)", () => {
    const movement = generateStandardMitchell(spec);
    const result = applyMitchellSitOut(movement, "3EW");

    // The phantom is the EW pair "3EW". In each round it sits at exactly one
    // table; that table plays no boards that round.
    const emptyRoundsPerTable = result.tables.map(
      (t) => t.rounds.filter((r) => r.boards.length === 0).length,
    );

    // Exactly one table sits out per round, across 5 rounds => 5 empty rounds
    // spread across the tables.
    const totalEmpty = emptyRoundsPerTable.reduce((a, b) => a + b, 0);
    expect(totalEmpty).toBe(5);
  });

  it("gives each table exactly one sit-out round for an EW phantom", () => {
    const movement = generateStandardMitchell(spec);
    const result = applyMitchellSitOut(movement, "3EW");

    // Every NS table meets each EW pair exactly once, so each table sits out
    // exactly once (when it meets the phantom).
    for (const table of result.tables) {
      const empties = table.rounds.filter((r) => r.boards.length === 0);
      expect(empties).toHaveLength(1);
    }
  });

  it("leaves boards untouched for a table that never meets the phantom directionally", () => {
    // NS phantom at table 3: only table 3's NS is the phantom, and since NS is
    // fixed, table 3 always sits out and no other table loses boards.
    const movement = generateStandardMitchell(spec);
    const result = applyMitchellSitOut(movement, "3NS");

    const table3 = result.tables.find((t) => t.table === 3)!;
    expect(table3.rounds.every((r) => r.boards.length === 0)).toBe(true);

    for (const table of result.tables) {
      if (table.table === 3) continue;
      expect(table.rounds.every((r) => r.boards.length > 0)).toBe(true);
    }
  });

  it("does not lose any board for the un-phantomed tables", () => {
    const movement = generateStandardMitchell(spec);
    const result = applyMitchellSitOut(movement, "1EW");

    const playedBoards = result.tables.flatMap((t) =>
      t.rounds.flatMap((r) => r.boards),
    );

    // Original total was 5 tables * 5 rounds * 3 boards = 75; with one sit-out
    // per round (5 rounds) we lose 5 * 3 = 15 boards.
    expect(playedBoards).toHaveLength(75 - 15);
  });
});

describe("generateStandardMitchellWithSitOut", () => {
  it("returns an untouched movement when no sit-out is requested", () => {
    const result = generateStandardMitchellWithSitOut(spec, null);
    const plain = generateStandardMitchell(spec);
    expect(result).toEqual(plain);
  });

  it("applies the sit-out when a seat is requested", () => {
    const result = generateStandardMitchellWithSitOut(spec, "2EW");
    const totalEmpty = result.tables
      .flatMap((t) => t.rounds)
      .filter((r) => r.boards.length === 0).length;
    expect(totalEmpty).toBe(5);
  });

  it("throws for skip / share-and-relay specs", () => {
    expect(() =>
      generateStandardMitchellWithSitOut(
        { ...spec, tables: 6, skip: true },
        "1EW",
      ),
    ).toThrow("only supported for Standard Mitchell");
  });
});
