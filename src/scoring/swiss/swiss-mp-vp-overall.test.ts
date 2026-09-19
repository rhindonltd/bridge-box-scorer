import { describe, expect, it } from "vitest";
import { SwissVpBoardRow } from "./swiss-vp-overall";
import { calculateSwissMpVpOverall } from "./swiss-mp-vp-overall";

function row(overrides: Partial<SwissVpBoardRow>): SwissVpBoardRow {
  return {
    section: "A",
    roundNumber: 1,
    tableNumber: 1,
    boardNumber: 1,
    ns: "A1NS",
    ew: "A2EW",
    confirmedResult: null,
    directorOverrideResult: null,
    status: "COMPLETE",
    ...overrides,
  };
}

describe("calculateSwissMpVpOverall", () => {
  it("returns empty, well-formed metadata for no rows", () => {
    const result = calculateSwissMpVpOverall([]);
    expect(result.type).toBe("PAIR_SWISS_VP");
    expect(result.mode).toBe("PAIR");
    expect(result.scoring).toBe("SWISS_VP");
    expect(result.lines).toHaveLength(0);
  });

  it("scores a round against the whole field and converts % to VP", () => {
    // Round 1, board 1, played at two tables (a 2-table field).
    // Table 1 NS makes 3NT+1 (+430); Table 2 NS makes only 3NT= (+400).
    // So table-1 NS tops the field (100%), table-2 NS is bottom (0%).
    const rows: SwissVpBoardRow[] = [
      row({
        tableNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "3NTN+1",
      }),
      row({
        tableNumber: 2,
        ns: "A3NS",
        ew: "A4EW",
        confirmedResult: "3NTN=",
      }),
    ];

    const result = calculateSwissMpVpOverall(rows);

    const top = result.lines.find((l) => l.pairId === "A1NS")!;
    const bottom = result.lines.find((l) => l.pairId === "A3NS")!;

    // Field top -> 100% -> capped at 20 VP; field bottom -> 0% -> 0 VP.
    expect(top.vpByRound[1]).toBe(20);
    expect(bottom.vpByRound[1]).toBe(0);
    // Highest total ranks first.
    expect(result.lines[0].pairId).toBe("A1NS");
    // Total equals the single round's VP.
    expect(top.totalVP).toBe(20);
  });

  it("gives a dead-average field 50% -> 10 VP to everyone", () => {
    // Two tables, identical result -> everyone ties at 50%.
    const rows: SwissVpBoardRow[] = [
      row({ tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: "3NTN=" }),
    ];

    const result = calculateSwissMpVpOverall(rows);
    for (const line of result.lines) {
      expect(line.vpByRound[1]).toBe(10);
    }
  });

  it("shows a running estimate over the boards scored so far", () => {
    // A1NS plays two boards this round; only one is entered. The estimate uses
    // the scored board against the current field rather than waiting.
    const rows: SwissVpBoardRow[] = [
      row({
        tableNumber: 1,
        boardNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "3NTN+1",
      }),
      row({
        tableNumber: 2,
        boardNumber: 1,
        ns: "A3NS",
        ew: "A4EW",
        confirmedResult: "3NTN=",
      }),
      // Board 2 at A1NS's table is not entered yet.
      row({
        tableNumber: 1,
        boardNumber: 2,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: null,
      }),
      row({
        tableNumber: 2,
        boardNumber: 2,
        ns: "A3NS",
        ew: "A4EW",
        confirmedResult: "3NTN=",
      }),
    ];

    const result = calculateSwissMpVpOverall(rows);
    // A1NS tops the field on its one scored board, so it has a running VP above
    // the neutral 10 rather than being left out.
    const a1 = result.lines.find((l) => l.pairId === "A1NS");
    expect(a1).toBeDefined();
    expect(a1!.vpByRound[1]).toBeGreaterThan(10);
  });

  it("shows a neutral 10 for a drawn round with no results yet", () => {
    const rows: SwissVpBoardRow[] = [
      row({ tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: null }),
      row({ tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: null }),
    ];

    const result = calculateSwissMpVpOverall(rows);
    expect(result.lines).toHaveLength(4);
    for (const line of result.lines) {
      expect(line.vpByRound[1]).toBe(10);
    }
  });

  it("shows a neutral 10 when a scored board has no comparison (single-table field)", () => {
    // Only one table played the board, so there is no field to matchpoint
    // against (max matchpoints is 0). The pair has a scored board but the
    // round still shows the neutral 10 VP.
    const rows: SwissVpBoardRow[] = [
      row({ tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
    ];

    const result = calculateSwissMpVpOverall(rows);
    const ns = result.lines.find((l) => l.pairId === "A1NS")!;
    const ew = result.lines.find((l) => l.pairId === "A2EW")!;
    expect(ns.vpByRound[1]).toBe(10);
    expect(ew.vpByRound[1]).toBe(10);
  });

  it("ignores sit-out (bye) rows", () => {
    const rows: SwissVpBoardRow[] = [
      row({
        tableNumber: 3,
        ns: "A5NS",
        ew: "PHANTOM",
        status: "SIT_OUT",
        confirmedResult: "3NTN=",
      }),
      // A real match so the field is non-trivial.
      row({ tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: "3NTN=" }),
    ];

    const result = calculateSwissMpVpOverall(rows);
    expect(result.lines.find((l) => l.pairId === "A5NS")).toBeUndefined();
  });
});
