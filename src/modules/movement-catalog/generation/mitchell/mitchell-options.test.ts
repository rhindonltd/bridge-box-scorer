import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  findBestBoardsPerPlayer,
  generateMitchellOptions,
} from "./mitchell-options";

// generateMitchellOptions logs its chosen candidate; keep test output clean.
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("findBestBoardsPerPlayer", () => {
  it("maximises rounds within the default target window (18-22)", () => {
    // tables=10: rounds=10 down to 2. boardsPerRound from 2.
    // rounds=10,bpr=2 -> 20 (in [18,22]) -> returned immediately.
    expect(findBestBoardsPerPlayer(10)).toBe(20);
  });

  it("returns a board count inside the +/-2 target window", () => {
    const result = findBestBoardsPerPlayer(9);
    expect(result).toBeGreaterThanOrEqual(18);
    expect(result).toBeLessThanOrEqual(22);
  });

  it("respects a custom target", () => {
    const result = findBestBoardsPerPlayer(6, 12);
    expect(result).toBeGreaterThanOrEqual(10);
    expect(result).toBeLessThanOrEqual(14);
  });

  it("falls back to the target when no candidate fits the window", () => {
    // 1 table can only ever give rounds>=2 with rounds<=tables -> impossible,
    // so the loop finds nothing and the target is returned.
    expect(findBestBoardsPerPlayer(1, 20)).toBe(20);
  });

  it("skips candidates outside the target window before accepting one", () => {
    // tables=3, target=20 (window [18,22]): at rounds=3 the early bpr values
    // (2->6, 3->9, 4->12, 5->15) fall below the window and hit the continue
    // guard, until bpr=6 yields 18, the first candidate inside the window.
    expect(findBestBoardsPerPlayer(3, 20)).toBe(18);
  });
});

describe("generateMitchellOptions", () => {
  it("returns a plain Mitchell for an odd number of tables", () => {
    // tables=7, 18 boards: bpr=3 -> rounds=6 (<=7) is first valid.
    expect(generateMitchellOptions(7, 18)).toEqual([
      { name: "Mitchell", spec: { tables: 7, rounds: 6, boardsPerRound: 3 } },
    ]);
  });

  it("returns Share and Relay when rounds equals tables (even)", () => {
    // tables=8, 16 boards: bpr=2 -> rounds=8 === tables.
    expect(generateMitchellOptions(8, 16)).toEqual([
      {
        name: "Mitchell - Share and Relay",
        spec: { tables: 8, rounds: 8, boardsPerRound: 2, shareAndRelay: true },
      },
    ]);
  });

  it("returns a Skip Mitchell when even and rounds < tables", () => {
    // tables=8, 12 boards: bpr=2 -> rounds=6 (<8).
    expect(generateMitchellOptions(8, 12)).toEqual([
      {
        name: "Mitchell - Skip",
        spec: { tables: 8, rounds: 6, boardsPerRound: 2, skip: true },
      },
    ]);
  });

  it("skips boards-per-round that do not divide evenly, then the next round that would exceed tables", () => {
    // tables=4, 12 boards: bpr=2 -> rounds=6 > 4 (skip); bpr=3 -> rounds=4 === tables.
    expect(generateMitchellOptions(4, 12)).toEqual([
      {
        name: "Mitchell - Share and Relay",
        spec: { tables: 4, rounds: 4, boardsPerRound: 3, shareAndRelay: true },
      },
    ]);
  });

  it("returns an empty list when no valid movement exists", () => {
    // 13 is prime and > maxBoardsPerRound, so nothing divides it in [2,12].
    expect(generateMitchellOptions(5, 13)).toEqual([]);
  });

  it("skips a single-round candidate before returning empty", () => {
    // tables=5, 2 boards: bpr=2 divides -> rounds=1, hitting the rounds<=1
    // guard. No larger bpr divides 2, so the result is empty.
    expect(generateMitchellOptions(5, 2)).toEqual([]);
  });

  it("validates tables", () => {
    expect(() => generateMitchellOptions(0, 12)).toThrow(
      /tables must be a positive integer/,
    );
    expect(() => generateMitchellOptions(2.5, 12)).toThrow(
      /tables must be a positive integer/,
    );
  });

  it("validates boardsPerPlayer", () => {
    expect(() => generateMitchellOptions(8, 0)).toThrow(
      /boardsPerPlayer must be a positive integer/,
    );
  });

  it("validates boards-per-round limits", () => {
    expect(() => generateMitchellOptions(8, 12, 0, 12)).toThrow(
      /Invalid boards-per-round limits/,
    );
    expect(() => generateMitchellOptions(8, 12, 5, 3)).toThrow(
      /Invalid boards-per-round limits/,
    );
  });
});
