import { describe, it, expect } from "vitest";
import { isBoardEntered, computeRoundStatus, BoardEntry } from "./round-status";

describe("isBoardEntered", () => {
  it("returns true when directorOverrideResult is non-null", () => {
    expect(isBoardEntered({ directorOverrideResult: "3NTN=" })).toBe(true);
  });

  it("returns true when confirmedResult is non-null", () => {
    expect(isBoardEntered({ confirmedResult: "4SE+1" })).toBe(true);
  });

  it("returns true when status is CONFIRMED", () => {
    expect(isBoardEntered({ status: "CONFIRMED" })).toBe(true);
  });

  it("returns true when status is PENDING_CONFIRMATION", () => {
    expect(isBoardEntered({ status: "PENDING_CONFIRMATION" })).toBe(true);
  });

  it("returns true when status is OVERRIDDEN", () => {
    expect(isBoardEntered({ status: "OVERRIDDEN" })).toBe(true);
  });

  it("returns false when all fields are null/undefined", () => {
    expect(isBoardEntered({})).toBe(false);
    expect(
      isBoardEntered({
        confirmedResult: null,
        directorOverrideResult: null,
        status: null,
      }),
    ).toBe(false);
  });

  it("returns false when status is NOT_PLAYED", () => {
    expect(isBoardEntered({ status: "NOT_PLAYED" })).toBe(false);
  });

  it("returns false when status is an unrelated value", () => {
    expect(isBoardEntered({ status: "WAITING" })).toBe(false);
  });

  it("director override takes precedence even if other fields are null", () => {
    expect(
      isBoardEntered({
        directorOverrideResult: "PO",
        confirmedResult: null,
        status: "NOT_PLAYED",
      }),
    ).toBe(true);
  });
});

describe("computeRoundStatus", () => {
  it("returns empty array for empty input", () => {
    expect(computeRoundStatus([])).toEqual([]);
  });

  it("computes status for a single table with all boards entered in one round", () => {
    const boards: BoardEntry[] = [
      { tableNumber: 1, roundNumber: 1, boardNumber: 1, hasResult: true },
      { tableNumber: 1, roundNumber: 1, boardNumber: 2, hasResult: true },
    ];
    const result = computeRoundStatus(boards);
    expect(result).toEqual([
      {
        tableNumber: 1,
        currentRound: 1,
        boardsEntered: 2,
        boardsTotal: 2,
        hasMissingPreviousRounds: false,
        missingRounds: [],
      },
    ]);
  });

  it("computes status for partially entered current round", () => {
    const boards: BoardEntry[] = [
      { tableNumber: 1, roundNumber: 1, boardNumber: 1, hasResult: true },
      { tableNumber: 1, roundNumber: 1, boardNumber: 2, hasResult: false },
    ];
    const result = computeRoundStatus(boards);
    expect(result).toEqual([
      {
        tableNumber: 1,
        currentRound: 1,
        boardsEntered: 1,
        boardsTotal: 2,
        hasMissingPreviousRounds: false,
        missingRounds: [],
      },
    ]);
  });

  it("detects missing previous rounds", () => {
    const boards: BoardEntry[] = [
      // Round 1 - not all entered
      { tableNumber: 1, roundNumber: 1, boardNumber: 1, hasResult: true },
      { tableNumber: 1, roundNumber: 1, boardNumber: 2, hasResult: false },
      // Round 2 - has some entered (making this the current round)
      { tableNumber: 1, roundNumber: 2, boardNumber: 3, hasResult: true },
      { tableNumber: 1, roundNumber: 2, boardNumber: 4, hasResult: true },
    ];
    const result = computeRoundStatus(boards);
    expect(result).toEqual([
      {
        tableNumber: 1,
        currentRound: 2,
        boardsEntered: 2,
        boardsTotal: 2,
        hasMissingPreviousRounds: true,
        missingRounds: [1],
      },
    ]);
  });

  it("handles table with no entered boards", () => {
    const boards: BoardEntry[] = [
      { tableNumber: 1, roundNumber: 1, boardNumber: 1, hasResult: false },
      { tableNumber: 1, roundNumber: 1, boardNumber: 2, hasResult: false },
    ];
    const result = computeRoundStatus(boards);
    expect(result).toEqual([
      {
        tableNumber: 1,
        currentRound: 0,
        boardsEntered: 0,
        boardsTotal: 0,
        hasMissingPreviousRounds: false,
        missingRounds: [],
      },
    ]);
  });

  it("sorts results by tableNumber", () => {
    const boards: BoardEntry[] = [
      { tableNumber: 3, roundNumber: 1, boardNumber: 1, hasResult: true },
      { tableNumber: 1, roundNumber: 1, boardNumber: 2, hasResult: true },
      { tableNumber: 2, roundNumber: 1, boardNumber: 3, hasResult: true },
    ];
    const result = computeRoundStatus(boards);
    expect(result.map((r) => r.tableNumber)).toEqual([1, 2, 3]);
  });

  it("handles multiple tables independently", () => {
    const boards: BoardEntry[] = [
      // Table 1 - round 1 complete, round 2 partial
      { tableNumber: 1, roundNumber: 1, boardNumber: 1, hasResult: true },
      { tableNumber: 1, roundNumber: 2, boardNumber: 3, hasResult: true },
      { tableNumber: 1, roundNumber: 2, boardNumber: 4, hasResult: false },
      // Table 2 - only round 1
      { tableNumber: 2, roundNumber: 1, boardNumber: 5, hasResult: true },
    ];
    const result = computeRoundStatus(boards);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      tableNumber: 1,
      currentRound: 2,
      boardsEntered: 1,
      boardsTotal: 2,
    });
    expect(result[1]).toMatchObject({
      tableNumber: 2,
      currentRound: 1,
      boardsEntered: 1,
      boardsTotal: 1,
    });
  });

  it("reports multiple missing rounds", () => {
    const boards: BoardEntry[] = [
      // Round 1 - incomplete
      { tableNumber: 1, roundNumber: 1, boardNumber: 1, hasResult: false },
      // Round 2 - incomplete
      { tableNumber: 1, roundNumber: 2, boardNumber: 2, hasResult: false },
      // Round 3 - has result (current)
      { tableNumber: 1, roundNumber: 3, boardNumber: 3, hasResult: true },
    ];
    const result = computeRoundStatus(boards);
    expect(result[0].missingRounds).toEqual([1, 2]);
    expect(result[0].hasMissingPreviousRounds).toBe(true);
  });

  it("does not report a round as missing when there are no boards for that round number", () => {
    // Table has boards for rounds 1 and 3, but no boards at all for round 2
    // (gap in round numbering). Round 2 should NOT appear in missingRounds
    // because there are simply no boards to check.
    const boards: BoardEntry[] = [
      { tableNumber: 1, roundNumber: 1, boardNumber: 1, hasResult: true },
      { tableNumber: 1, roundNumber: 1, boardNumber: 2, hasResult: true },
      // No boards for round 2 at all
      { tableNumber: 1, roundNumber: 3, boardNumber: 5, hasResult: true },
      { tableNumber: 1, roundNumber: 3, boardNumber: 6, hasResult: false },
    ];
    const result = computeRoundStatus(boards);
    expect(result[0].currentRound).toBe(3);
    // Round 2 has no boards, so it is NOT missing (nothing to be unentered)
    expect(result[0].missingRounds).toEqual([]);
    expect(result[0].hasMissingPreviousRounds).toBe(false);
  });
});
