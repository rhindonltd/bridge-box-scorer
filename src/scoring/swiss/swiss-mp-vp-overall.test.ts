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

describe("calculateSwissMpVpOverall — §3.3.8/§3.3.9 voided pairs", () => {
  function voided(cause: string, overrides: Partial<SwissVpBoardRow>) {
    return row({
      status: "VOID_PAIR",
      directorOverrideResult: `VOIDP:${cause}` as never,
      confirmedResult: null,
      ...overrides,
    });
  }

  it("credits the non-offender AVE+ and the offender AVE- for a voided match", () => {
    // Round 1, board 1: tables 1 (A1 v A2) and 2 (A3 v A4) played; table 1 is
    // voided with EW (A2) at fault -> A1 (NS) AVE+, A2 (EW) AVE-.
    const rows: SwissVpBoardRow[] = [
      voided("OFFENDER_EW", {
        boardNumber: 1,
        tableNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
      }),
      // A real table so there is a field top for the AVE blend to scale on.
      row({ boardNumber: 1, tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 1, tableNumber: 3, ns: "A5NS", ew: "A6EW", confirmedResult: "2NTN=" }),
    ];

    const result = calculateSwissMpVpOverall(rows, { expectedBoards: 8 });
    const a1 = result.lines.find((l) => l.pairId === "A1NS")!;
    const a2 = result.lines.find((l) => l.pairId === "A2EW")!;
    expect(a1).toBeDefined();
    expect(a2).toBeDefined();
    // Non-offender above average, offender below.
    expect(a1.vpByRound[1]).toBeGreaterThan(10);
    expect(a2.vpByRound[1]).toBeLessThan(10);
  });

  it("excludes the voided match from the field the other pairs are scored against", () => {
    // Two tables play board 1; table 1 is voided. The surviving table (2) is
    // now the only real result in the field, so its pairs are scored among
    // themselves (not against the voided pair's result).
    const rowsWithVoid: SwissVpBoardRow[] = [
      voided("NEITHER", {
        boardNumber: 1,
        tableNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
      }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: "3NTN=" }),
    ];
    const result = calculateSwissMpVpOverall(rowsWithVoid, { expectedBoards: 8 });
    // The surviving table is a one-result field on that board (no comparison),
    // so A3/A4 sit at the neutral 10 — the voided A1/A2 result did NOT enter
    // their field.
    const a3 = result.lines.find((l) => l.pairId === "A3NS")!;
    expect(a3.vpByRound[1]).toBe(10);
  });

  it("gives both pairs an above-average VP when neither is at fault", () => {
    const rows: SwissVpBoardRow[] = [
      voided("NEITHER", { boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 1, tableNumber: 3, ns: "A5NS", ew: "A6EW", confirmedResult: "2NTN=" }),
    ];
    const result = calculateSwissMpVpOverall(rows, { expectedBoards: 8 });
    const a1 = result.lines.find((l) => l.pairId === "A1NS")!;
    const a2 = result.lines.find((l) => l.pairId === "A2EW")!;
    expect(a1.vpByRound[1]).toBeGreaterThan(10);
    expect(a2.vpByRound[1]).toBeGreaterThan(10);
  });
});
describe("calculateSwissMpVpOverall — §4.1.1.1 better than average (standings)", () => {
  // A1NS tops two real boards (100% average), then is given AVE+ on board 3.
  // The AVE+ board carries only A1's artificial line plus a plain comparison at
  // another table, so A1 is not a real line there (no Neuberg interaction on
  // it). The uplift keeps A1's 100% on board 3 → it tops the round's VP.
  it("uplifts an AVE+ board to the pair's match average when it exceeds 60%", () => {
    const rows: SwissVpBoardRow[] = [
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN+1" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 2, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN+1" }),
      row({ boardNumber: 2, tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 3, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: null, directorOverrideResult: "A60/40" as never, status: "OVERRIDDEN" }),
      row({ boardNumber: 3, tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: "3NTN=" }),
    ];

    const result = calculateSwissMpVpOverall(rows);
    const a1 = result.lines.find((l) => l.pairId === "A1NS")!;
    // Averaged 100% over its real boards and AVE+ keeps that → full 20 VP.
    expect(a1.vpByRound[1]).toBe(20);
  });

  it("keeps the flat 60% for AVE+ when the pair averages below 60%", () => {
    // A1 bottoms its two real boards (0%), then AVE+ on board 3 → flat 60%,
    // well short of the 100%-average case above.
    const rows: SwissVpBoardRow[] = [
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "2NTN=" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: "3NTN+1" }),
      row({ boardNumber: 2, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "2NTN=" }),
      row({ boardNumber: 2, tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: "3NTN+1" }),
      row({ boardNumber: 3, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: null, directorOverrideResult: "A60/40" as never, status: "OVERRIDDEN" }),
      row({ boardNumber: 3, tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: "3NTN+1" }),
    ];

    const result = calculateSwissMpVpOverall(rows);
    const a1 = result.lines.find((l) => l.pairId === "A1NS")!;
    // Real boards 0%, AVE+ board a flat 60% → a low round VP, far below the
    // 20 VP the 100%-average pair earns in the test above.
    expect(a1.vpByRound[1]).toBeLessThan(20);
  });
});

describe("calculateSwissMpVpOverall — F29 Neuberg over-projection clamp", () => {
  // A mixed board (one artificial adjusted line sharing the field with real
  // lines) makes Neuberg convention (b) over-project the field-topping real
  // pair's matchpoints: summed over the round, its mp can brush just past its
  // max, i.e. a percentage fractionally above 100%. The VP table used to throw
  // "Percentage must be between 0 and 100" on that; it must now clamp and score.
  it("does not throw when a real pair projects fractionally above 100%", () => {
    // Round 1 played at three tables. Board 1 is a mixed board: tables 1 and 2
    // are real, table 3 carries an artificial A50/50 line (a seat in the field
    // that counts toward the board's max but is not a real comparison). Board 2
    // is all-real so the field-topping pair keeps accumulating matchpoints.
    const rows: SwissVpBoardRow[] = [
      // Board 1 — mixed field.
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN+1" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: "3NTN=" }),
      row({
        boardNumber: 1,
        tableNumber: 3,
        ns: "A5NS",
        ew: "A6EW",
        confirmedResult: null,
        directorOverrideResult: "A50/50" as never,
        status: "OVERRIDDEN",
      }),
      // Board 2 — all real; A1NS tops it again.
      row({ boardNumber: 2, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN+1" }),
      row({ boardNumber: 2, tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 2, tableNumber: 3, ns: "A5NS", ew: "A6EW", confirmedResult: "2NTN=" }),
    ];

    expect(() => calculateSwissMpVpOverall(rows)).not.toThrow();

    const result = calculateSwissMpVpOverall(rows);
    const a1 = result.lines.find((l) => l.pairId === "A1NS")!;
    // The over-projected top pair is clamped to 100% → the maximum 20 VP,
    // never an out-of-range crash.
    expect(a1.vpByRound[1]).toBe(20);
  });
});

describe("calculateSwissMpVpOverall — §3.5 mismatch adjustment", () => {
  // A 2-table round over 4 boards. Table 1 NS (A1NS) wins every board (tops the
  // 2-table field → 100% → 20 VP); table 2 (A3NS/A4EW) is the floor. We then
  // declare table 1 a MISMATCH and check only the mismatched side moves.
  function fourBoardRows(mismatch?: {
    side: "NS" | "EW";
    direction: "HIGHER" | "LOWER";
    fault: "OWN" | "NOT";
  }): SwissVpBoardRow[] {
    const rows: SwissVpBoardRow[] = [];
    for (let b = 1; b <= 4; b++) {
      rows.push(
        row({
          boardNumber: b,
          tableNumber: 1,
          ns: "A1NS",
          ew: "A2EW",
          confirmedResult: "3NTN+1" as BoardOutcome, // tops the field
          status: mismatch ? "MISMATCH" : "CONFIRMED",
          matchRuling: mismatch
            ? `MM:${mismatch.side}:${mismatch.direction}:${mismatch.fault}`
            : null,
        }),
      );
      rows.push(
        row({
          boardNumber: b,
          tableNumber: 2,
          ns: "A3NS",
          ew: "A4EW",
          confirmedResult: "3NTN=" as BoardOutcome, // floor
          status: "CONFIRMED",
        }),
      );
    }
    return rows;
  }

  it("docks the mismatched side (LOWER + own fault) and leaves the opponent", () => {
    const base = calculateSwissMpVpOverall(fourBoardRows());
    const baseA1 = base.lines.find((l) => l.pairId === "A1NS")!.vpByRound[1];
    const baseA2 = base.lines.find((l) => l.pairId === "A2EW")!.vpByRound[1];

    // A1NS (NS seat of table 1) is the mismatched side; it played a weaker
    // opponent through its own fault → its VP above 5 is docked a quarter.
    const ruled = calculateSwissMpVpOverall(
      fourBoardRows({ side: "NS", direction: "LOWER", fault: "OWN" }),
    );
    const ruledA1 = ruled.lines.find((l) => l.pairId === "A1NS")!.vpByRound[1];
    const ruledA2 = ruled.lines.find((l) => l.pairId === "A2EW")!.vpByRound[1];

    // A1NS topped the field (20 VP actual) → docked to 20 − (20−5)/4 = 16.25.
    expect(baseA1).toBe(20);
    expect(ruledA1).toBeCloseTo(16.25, 5);
    // The opponent (A2EW) is untouched by the ruling.
    expect(ruledA2).toBe(baseA2);
  });

  it("leaves both sides unchanged for a no-op treatment (LOWER + not fault)", () => {
    const base = calculateSwissMpVpOverall(fourBoardRows());
    const ruled = calculateSwissMpVpOverall(
      fourBoardRows({ side: "NS", direction: "LOWER", fault: "NOT" }),
    );
    for (const pairId of ["A1NS", "A2EW"]) {
      expect(ruled.lines.find((l) => l.pairId === pairId)!.vpByRound[1]).toBe(
        base.lines.find((l) => l.pairId === pairId)!.vpByRound[1],
      );
    }
  });

  it("keeps the mismatched board in the field (opponents still scored on it)", () => {
    // The floor pair A3NS is scored against table 1's real result whether or
    // not table 1 is ruled a mismatch — the board stays in the field.
    const base = calculateSwissMpVpOverall(fourBoardRows());
    const ruled = calculateSwissMpVpOverall(
      fourBoardRows({ side: "NS", direction: "LOWER", fault: "OWN" }),
    );
    const baseFloor = base.lines.find((l) => l.pairId === "A3NS")!.vpByRound[1];
    const ruledFloor = ruled.lines.find((l) => l.pairId === "A3NS")!.vpByRound[1];
    expect(ruledFloor).toBe(baseFloor);
  });
});
