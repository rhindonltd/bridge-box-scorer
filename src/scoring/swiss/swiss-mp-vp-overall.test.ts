import { describe, expect, it } from "vitest";
import { SwissVpBoardRow } from "./swiss-vp-overall";
import { calculateSwissMpVpOverall } from "./swiss-mp-vp-overall";
import { BoardOutcome } from "@/model/score";

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

  // --- "2 half matches" (odd-field) rounds -----------------------------------

  describe("2 half matches round", () => {
    // An 8-board round. Two ordinary tables (T2, T3) play all 8 boards and form
    // the field. The half-match group: ANCHOR plays X on boards 1-4 (S1) and Y
    // on boards 5-8 (S2); X is compensated on S2, Y on S1. ANCHOR tops the
    // field on every board (6NT=, vs the ordinary tables' 3NT=), and the X/Y
    // seats are the field floor on the boards they play.
    const TOP: BoardOutcome = "6NTN=";
    const MID: BoardOutcome = "3NTN=";

    function halfMatchRows(): SwissVpBoardRow[] {
      const rows: SwissVpBoardRow[] = [];
      // Anchor table: half 1 (boards 1-4) vs X, half 2 (boards 5-8) vs Y.
      for (let b = 1; b <= 4; b++) {
        rows.push(row({ tableNumber: 1, boardNumber: b, ns: "ANCHOR", ew: "X", confirmedResult: TOP }));
      }
      for (let b = 5; b <= 8; b++) {
        rows.push(row({ tableNumber: 1, boardNumber: b, ns: "ANCHOR", ew: "Y", confirmedResult: TOP }));
      }
      // Two ordinary tables playing all 8 boards. A2 sits second of the field
      // on every board (3NT=, between the anchor's 6NT= and A3's 3NT-1), so it
      // lands exactly mid-field — the neutral 10 over a full ordinary round.
      for (let b = 1; b <= 8; b++) {
        rows.push(row({ tableNumber: 2, boardNumber: b, ns: "A2NS", ew: "A2EW", confirmedResult: MID }));
        rows.push(row({ tableNumber: 3, boardNumber: b, ns: "A3NS", ew: "A3EW", confirmedResult: "3NTN-1" }));
      }
      // Compensation: X missed S2 (boards 5-8), Y missed S1 (boards 1-4).
      for (let b = 5; b <= 8; b++) {
        rows.push(row({ tableNumber: 1, boardNumber: b, ns: "X", ew: "PHANTOM", status: "HALF_AVERAGE", confirmedResult: null }));
      }
      for (let b = 1; b <= 4; b++) {
        rows.push(row({ tableNumber: 1, boardNumber: b, ns: "Y", ew: "PHANTOM", status: "HALF_AVERAGE", confirmedResult: null }));
      }
      return rows;
    }

    const vpOf = (
      result: ReturnType<typeof calculateSwissMpVpOverall>,
      id: string,
    ) => result.lines.find((l) => l.pairId === id)!.vpByRound[1];

    it("credits the anchor its two real halves summed to /20", () => {
      const result = calculateSwissMpVpOverall(halfMatchRows());
      // Anchor tops a 3-result field on every board → 100% each half → 10 + 10.
      expect(vpOf(result, "ANCHOR")).toBe(20);
    });

    it("credits a non-anchor its played half plus the AVE+/AVE compensation", () => {
      const result = calculateSwissMpVpOverall(halfMatchRows());
      // X plays the EW seat opposite the field-topping anchor on S1 → field
      // floor → 0% real half → 0 VP. Its compensated half of 4 boards is AVE+ on
      // 2 (60%) + AVE on 2 (50%) = 55%. On the 10-VP half table, the 4-board
      // column puts 55% in the 7-3 band (>54.03, ≤57.03) → 7 VP.
      expect(vpOf(result, "X")).toBe(0 + 7);
      // Y mirrors X (played S2 as the floor, compensated on S1).
      expect(vpOf(result, "Y")).toBe(0 + 7);
    });

    it("still scores an ordinary field table as one full-round segment (20-VP scale)", () => {
      const result = calculateSwissMpVpOverall(halfMatchRows());
      // A2 plays all 8 boards against one set of opponents — a single ordinary
      // segment, NOT two halves. Sitting exactly mid-field (second of three on
      // every board → 50%) it earns the neutral 10 over the full round.
      expect(vpOf(result, "A2NS")).toBe(10);
    });

    it("never emits a line for the phantom opponent of a compensated half", () => {
      // The HALF_AVERAGE rows carry a phantom EW ("PHANTOM"); it is not a real
      // pair and must not be scored as one (which would leak a spurious extra
      // leaderboard line). The field is exactly ANCHOR, X, Y and the two
      // ordinary tables' four pairs — never the phantom.
      const result = calculateSwissMpVpOverall(halfMatchRows());
      expect(result.lines.some((l) => l.pairId === "PHANTOM")).toBe(false);
      expect(result.lines.map((l) => l.pairId).sort()).toEqual(
        ["A2EW", "A2NS", "A3EW", "A3NS", "ANCHOR", "X", "Y"].sort(),
      );
    });
  });
});
