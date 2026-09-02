import { describe, it, expect } from "vitest";
import {
  applyMitchellSitOut,
  generateStandardMitchellWithSitOut,
} from "./sit-out";
import { generateStandardMitchell } from "./standard-mitchell";

const spec = { tables: 5, rounds: 5, boardsPerRound: 3 };

function sitOutCount(movement: { rounds: { sitOut?: boolean }[] }[]): number {
  return movement.flatMap((t) => t.rounds).filter((r) => r.sitOut).length;
}

describe("applyMitchellSitOut", () => {
  it("flags one sit-out round per table for an EW phantom", () => {
    const movement = generateStandardMitchell(spec);
    const result = applyMitchellSitOut(movement, "A3EW");

    // Every NS table meets each EW pair exactly once, so each table sits out
    // exactly once (when it meets the phantom).
    for (const table of result) {
      const flagged = table.rounds.filter((r) => r.sitOut);
      expect(flagged).toHaveLength(1);
    }
    expect(sitOutCount(result)).toBe(5);
  });

  it("keeps the real board ranges on flagged rounds", () => {
    const movement = generateStandardMitchell(spec);
    const result = applyMitchellSitOut(movement, "A3EW");

    for (const table of result) {
      for (const round of table.rounds) {
        expect(round.boardEnd).toBeGreaterThanOrEqual(round.boardStart);
      }
    }
  });

  it("flags an NS phantom's own table every round", () => {
    const movement = generateStandardMitchell(spec);
    const result = applyMitchellSitOut(movement, "A3NS");

    const table3 = result.find((t) => t.tableNumber === 3)!;
    expect(table3.rounds.every((r) => r.sitOut)).toBe(true);

    for (const table of result) {
      if (table.tableNumber === 3) continue;
      expect(table.rounds.every((r) => !r.sitOut)).toBe(true);
    }
  });

  it("flags nothing when no sit-out seat is given", () => {
    const movement = generateStandardMitchell(spec);
    const result = applyMitchellSitOut(movement, null);
    expect(sitOutCount(result)).toBe(0);
  });
});

describe("generateStandardMitchellWithSitOut", () => {
  it("returns a movement with no sit-outs when none requested", () => {
    const result = generateStandardMitchellWithSitOut(spec, null);
    expect(sitOutCount(result)).toBe(0);
    // Same tables/rounds as the plain movement.
    expect(result).toHaveLength(5);
    expect(result[0].rounds).toHaveLength(5);
  });

  it("applies the sit-out when a seat is requested", () => {
    const result = generateStandardMitchellWithSitOut(spec, "A2EW");
    expect(sitOutCount(result)).toBe(5);
  });

  it("throws for skip / share-and-relay specs", () => {
    expect(() =>
      generateStandardMitchellWithSitOut(
        { ...spec, tables: 6, skip: true },
        "A1EW",
      ),
    ).toThrow("only supported for Standard Mitchell");
  });
});
