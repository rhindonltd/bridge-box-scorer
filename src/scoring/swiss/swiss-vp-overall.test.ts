import { describe, expect, it } from "vitest";
import { SwissVpBoardRow, calculateSwissVpOverall } from "./swiss-vp-overall";

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

describe("calculateSwissVpOverall", () => {
  it("returns empty, well-formed metadata for no rows", () => {
    const result = calculateSwissVpOverall([]);
    expect(result.type).toBe("PAIR_SWISS_VP");
    expect(result.mode).toBe("PAIR");
    expect(result.scoring).toBe("SWISS_VP");
    expect(result.lines).toHaveLength(0);
  });

  it("awards VP per round and sums into a session total ranked highest-first", () => {
    // Round 1: table 1, one board. NS (A1NS) makes 3NT vulnerable for +600,
    // EW plays it flat for +120 the other way — but with a single line per
    // board here, the NS score alone drives the margin. Use two boards so the
    // margin is a clear NS win.
    const rows: SwissVpBoardRow[] = [
      // Round 1, table 1: A1NS vs A2EW — NS wins big.
      row({
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "6NTN=",
      }),
      row({
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 2,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "6NTN=",
      }),
      // Round 2, table 1: A1NS vs A3EW — NS wins again.
      row({
        roundNumber: 2,
        tableNumber: 1,
        boardNumber: 3,
        ns: "A1NS",
        ew: "A3EW",
        confirmedResult: "6NTN=",
      }),
    ];

    const result = calculateSwissVpOverall(rows);

    const winner = result.lines.find((l) => l.pairId === "A1NS")!;
    expect(winner).toBeDefined();
    // A1NS has a VP entry for both rounds it played.
    expect(Object.keys(winner.vpByRound).map(Number).sort()).toEqual([1, 2]);
    // Winning both rounds beats its opponents' totals, so it ranks first.
    expect(result.lines[0].pairId).toBe("A1NS");
    expect(winner.totalVP).toBe(
      Math.round((winner.vpByRound[1] + winner.vpByRound[2]) * 100) / 100,
    );

    // Each match's two sides split exactly 20 VP.
    const r1a = result.lines.find((l) => l.pairId === "A1NS")!.vpByRound[1];
    const r1b = result.lines.find((l) => l.pairId === "A2EW")!.vpByRound[1];
    expect(Math.round((r1a + r1b) * 100) / 100).toBe(20);
  });

  it("shows a running estimate over the boards scored so far", () => {
    const rows: SwissVpBoardRow[] = [
      row({
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "6NTN=",
      }),
      // Second board of the same match is not yet entered.
      row({
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 2,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: null,
      }),
    ];

    const result = calculateSwissVpOverall(rows);
    const ns = result.lines.find((l) => l.pairId === "A1NS")!;
    const ew = result.lines.find((l) => l.pairId === "A2EW")!;
    // The one scored board already favours NS, so the live estimate is not the
    // neutral 10 and the two sides still split exactly 20.
    expect(ns.vpByRound[1]).toBeGreaterThan(10);
    expect(Math.round((ns.vpByRound[1] + ew.vpByRound[1]) * 100) / 100).toBe(
      20,
    );
  });

  it("shows a neutral 10 for a drawn round with no results yet", () => {
    const rows: SwissVpBoardRow[] = [
      row({
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: null,
      }),
    ];

    const result = calculateSwissVpOverall(rows);
    expect(result.lines.find((l) => l.pairId === "A1NS")!.vpByRound[1]).toBe(
      10,
    );
    expect(result.lines.find((l) => l.pairId === "A2EW")!.vpByRound[1]).toBe(
      10,
    );
  });

  it("ignores sit-out (bye) rows", () => {
    const rows: SwissVpBoardRow[] = [
      row({
        roundNumber: 1,
        tableNumber: 3,
        boardNumber: 1,
        ns: "A5NS",
        ew: "PHANTOM",
        status: "SIT_OUT",
        confirmedResult: "3NTN=",
      }),
    ];

    const result = calculateSwissVpOverall(rows);
    expect(result.lines).toHaveLength(0);
  });

  it("awards the win to EW when the margin is negative (NS goes minus)", () => {
    const rows: SwissVpBoardRow[] = [
      // NS declares and goes down heavily, so the NS score is negative and the
      // match margin favours EW.
      row({
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "7NTN-7",
      }),
    ];

    const result = calculateSwissVpOverall(rows);
    const ns = result.lines.find((l) => l.pairId === "A1NS")!;
    const ew = result.lines.find((l) => l.pairId === "A2EW")!;
    expect(ew.vpByRound[1]).toBeGreaterThan(ns.vpByRound[1]);
    // The two sides still split exactly 20 VP.
    expect(Math.round((ns.vpByRound[1] + ew.vpByRound[1]) * 100) / 100).toBe(
      20,
    );
  });

  it("uses the director override result over the confirmed result", () => {
    const rows: SwissVpBoardRow[] = [
      row({
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "1NTN=",
        directorOverrideResult: "6NTN=",
      }),
    ];

    const result = calculateSwissVpOverall(rows);
    const ns = result.lines.find((l) => l.pairId === "A1NS")!;
    const ew = result.lines.find((l) => l.pairId === "A2EW")!;
    // NS made a slam via the override, so NS is the winner of round 1.
    expect(ns.vpByRound[1]).toBeGreaterThan(ew.vpByRound[1]);
  });
});
