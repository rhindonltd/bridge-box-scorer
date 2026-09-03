import { describe, it, expect } from "vitest";

import {
  wrapValue,
  boardsForSet,
  validateMitchellSpec,
  getPairIds,
  type MitchellMovementSpec,
} from "./mitchell-utils";

describe("wrapValue", () => {
  it("returns the value unchanged when within [1, modulus]", () => {
    expect(wrapValue(1, 5)).toBe(1);
    expect(wrapValue(3, 5)).toBe(3);
    expect(wrapValue(5, 5)).toBe(5);
  });

  it("wraps values above the modulus back into range", () => {
    expect(wrapValue(6, 5)).toBe(1);
    expect(wrapValue(7, 5)).toBe(2);
    expect(wrapValue(11, 5)).toBe(1);
  });

  it("wraps non-positive values into range", () => {
    expect(wrapValue(0, 5)).toBe(5);
    expect(wrapValue(-1, 5)).toBe(4);
  });

  it("is stable across a full cycle (1-based ring)", () => {
    const modulus = 4;
    const seen = [1, 2, 3, 4, 5, 6, 7, 8].map((v) => wrapValue(v, modulus));
    expect(seen).toEqual([1, 2, 3, 4, 1, 2, 3, 4]);
  });
});

describe("boardsForSet", () => {
  it("computes the board numbers for the first set", () => {
    expect(boardsForSet(1, 3)).toEqual([1, 2, 3]);
  });

  it("offsets subsequent sets by the boards-per-round", () => {
    expect(boardsForSet(2, 3)).toEqual([4, 5, 6]);
    expect(boardsForSet(3, 2)).toEqual([5, 6]);
  });

  it("handles a single board per set", () => {
    expect(boardsForSet(4, 1)).toEqual([4]);
  });
});

describe("validateMitchellSpec", () => {
  const base: MitchellMovementSpec = { tables: 8, rounds: 8, boardsPerRound: 2 };

  it("accepts a valid spec", () => {
    expect(() => validateMitchellSpec(base)).not.toThrow();
  });

  it("rejects non-positive / non-integer table counts", () => {
    expect(() => validateMitchellSpec({ ...base, tables: 0 })).toThrow(
      /tables must be a positive integer/,
    );
    expect(() => validateMitchellSpec({ ...base, tables: 1.5 })).toThrow(
      /tables must be a positive integer/,
    );
  });

  it("requires at least 2 rounds", () => {
    expect(() => validateMitchellSpec({ ...base, rounds: 1 })).toThrow(
      /at least 2 rounds/,
    );
  });

  it("rejects more rounds than tables", () => {
    expect(() =>
      validateMitchellSpec({ ...base, tables: 4, rounds: 5 }),
    ).toThrow(/cannot have more rounds than tables/);
  });

  it("requires a positive integer boardsPerRound", () => {
    expect(() =>
      validateMitchellSpec({ ...base, boardsPerRound: 0 }),
    ).toThrow(/boardsPerRound must be a positive integer/);
  });
});

describe("getPairIds", () => {
  it("uses direction-suffixed ids for a two-winner movement (no arrow switch)", () => {
    expect(getPairIds(3, 5, 8, 0, 1, 8)).toEqual({ nsId: "3NS", ewId: "5EW" });
  });

  it("numbers EW pairs after NS pairs before the arrow switch (one-winner)", () => {
    // tables=8, arrowSwitchRounds=1, round 1 of 8 -> before switch.
    // ewPair = ewTable + tables = 5 + 8 = 13
    expect(getPairIds(3, 5, 8, 1, 1, 8)).toEqual({ nsId: "3", ewId: "13" });
  });

  it("swaps directions after the arrow switch", () => {
    // arrowSwitchFrom = totalRounds - arrowSwitchRounds + 1 = 8 - 1 + 1 = 8.
    // round 8 >= 8 -> switched. ewPair = 5 + 8 = 13.
    expect(getPairIds(3, 5, 8, 1, 8, 8)).toEqual({ nsId: "13", ewId: "3" });
  });

  it("treats the arrow-switch boundary round as switched", () => {
    // arrowSwitchRounds=2 -> arrowSwitchFrom = 8 - 2 + 1 = 7.
    expect(getPairIds(2, 4, 8, 2, 6, 8)).toEqual({ nsId: "2", ewId: "12" });
    expect(getPairIds(2, 4, 8, 2, 7, 8)).toEqual({ nsId: "12", ewId: "2" });
  });
});
