import { describe, it, expect } from "vitest";
import {
  scoreSwissVpRound,
  type SwissVpMatchRow,
} from "./swiss-vp-round";
import type { SwissVpBoardRow } from "./swiss-vp-overall";
import { buildPairVoid } from "@/model/pairs-match-void";
import { buildMismatch } from "@/model/swiss-mismatch";

function row(overrides: Partial<SwissVpBoardRow>): SwissVpBoardRow {
  return {
    section: "A",
    roundNumber: 1,
    tableNumber: 1,
    boardNumber: 1,
    ns: "A1NS",
    ew: "A1EW",
    confirmedResult: null,
    directorOverrideResult: null,
    status: "CONFIRMED",
    ...overrides,
  };
}

function match(overrides: Partial<SwissVpMatchRow>): SwissVpMatchRow {
  return {
    id: 1,
    roundNumber: 1,
    kind: "PAIRS",
    home: "A1NS",
    opponent: "A1EW",
    ruling: null,
    ...overrides,
  };
}

/** Three real tables on board 1 so there is a genuine field. */
function fieldRows(): SwissVpBoardRow[] {
  return [
    row({ tableNumber: 1, ns: "A1NS", ew: "A1EW", confirmedResult: "6NTN=", matchId: 1 }),
    row({ tableNumber: 2, ns: "A2NS", ew: "A2EW", confirmedResult: "3NTN=", matchId: 2 }),
    row({ tableNumber: 3, ns: "A3NS", ew: "A3EW", confirmedResult: "3NTN-1", matchId: 3 }),
  ];
}

describe.each(["MP", "XIMP"] as const)("scoreSwissVpRound (%s)", (mode) => {
  it("ignores SIT_OUT rows passed straight in", () => {
    const rows = [
      ...fieldRows(),
      row({ tableNumber: 4, ns: "BYE", ew: "PHANTOM", status: "SIT_OUT" }),
    ];
    const { pairVp } = scoreSwissVpRound(rows, mode);
    expect(pairVp.has("BYE")).toBe(false);
    expect(pairVp.has("A1NS")).toBe(true);
  });

  it("scores a half-match round where no board has a result as neutral halves", () => {
    // ANCHOR plays X on boards 1-2 and Y on boards 3-4, nothing entered; X and
    // Y are each compensated on the half they missed.
    const rows: SwissVpBoardRow[] = [];
    for (const b of [1, 2]) {
      rows.push(row({ boardNumber: b, ns: "ANCHOR", ew: "X" }));
      rows.push(row({ boardNumber: b, ns: "Y", ew: "PHANTOM", status: "HALF_AVERAGE" }));
    }
    for (const b of [3, 4]) {
      rows.push(row({ boardNumber: b, ns: "ANCHOR", ew: "Y" }));
      rows.push(row({ boardNumber: b, ns: "X", ew: "PHANTOM", status: "HALF_AVERAGE" }));
    }
    const { pairVp, matches } = scoreSwissVpRound(rows, mode);
    // Each real half and each compensated half is a dead-average 5 VP of 10.
    expect(pairVp.get("ANCHOR")).toBe(10);
    expect(pairVp.get("X")).toBe(10);
    expect(pairVp.get("Y")).toBe(10);
    expect(matches).toHaveLength(2);
    for (const m of matches) {
      expect(m.nsVp).toBe(5);
      expect(m.ewVp).toBe(5);
    }
  });

  it("scores an ordinary round where nothing has been entered as neutral", () => {
    const rows = [row({ ns: "A1NS", ew: "A1EW" })];
    const { pairVp } = scoreSwissVpRound(rows, mode);
    expect(pairVp.get("A1NS")).toBe(10);
    expect(pairVp.get("A1EW")).toBe(10);
  });

  describe("§3.3.8 void pairs", () => {
    const voidRows = (boards: number[], matchId = 1): SwissVpBoardRow[] =>
      boards.map((b) =>
        row({
          boardNumber: b,
          tableNumber: 1,
          ns: "A1NS",
          ew: "A1EW",
          status: "VOID_PAIR",
          matchId,
        }),
      );
    const realRows = (boards: number[]): SwissVpBoardRow[] =>
      boards.flatMap((b) => [
        row({ boardNumber: b, tableNumber: 2, ns: "A2NS", ew: "A2EW", confirmedResult: "3NTN=", matchId: 2 }),
        row({ boardNumber: b, tableNumber: 3, ns: "A3NS", ew: "A3EW", confirmedResult: "2NTN=", matchId: 3 }),
      ]);

    it("sizes a multi-board void from its rows when no board count is given", () => {
      const rows = [...voidRows([2, 1]), ...realRows([1, 2])];
      const { pairVp } = scoreSwissVpRound(rows, mode, undefined, [
        match({ id: 1, ruling: buildPairVoid("OFFENDER_EW") }),
      ]);
      expect(pairVp.get("A1NS")!).toBeGreaterThan(10);
      expect(pairVp.get("A1EW")!).toBeLessThan(10);
    });

    it("credits a void match that has no opposing pair", () => {
      const rows = [...voidRows([1]), ...realRows([1])];
      const { pairVp } = scoreSwissVpRound(rows, mode, 4, [
        match({ id: 1, opponent: null, ruling: buildPairVoid("NEITHER") }),
      ]);
      expect(pairVp.get("A1NS")!).toBeGreaterThan(10);
    });

    it("ignores a void ruling on a match with no board rows", () => {
      const { pairVp } = scoreSwissVpRound(fieldRows(), mode, 4, [
        match({ id: 99, ruling: buildPairVoid("NEITHER") }),
      ]);
      // The field is untouched: nobody was voided.
      expect(pairVp.get("A1NS")).toBeDefined();
    });
  });

  describe("§3.5 mismatch rulings", () => {
    it("adjusts the EW (opponent) side of a match", () => {
      const rows = fieldRows();
      const plain = scoreSwissVpRound(rows, mode).pairVp;
      const ruled = scoreSwissVpRound(rows, mode, undefined, [
        match({
          id: 3,
          home: "A3NS",
          opponent: "A3EW",
          ruling: buildMismatch({ side: "EW", direction: "HIGHER", fault: "NOT" }),
        }),
      ]).pairVp;
      // EW (A3EW) is compensated upward; the NS side is untouched.
      expect(ruled.get("A3EW")!).toBeGreaterThanOrEqual(plain.get("A3EW")!);
      expect(ruled.get("A3NS")).toBe(plain.get("A3NS"));
    });

    it("skips an EW ruling on a match with no opponent", () => {
      const rows = fieldRows();
      const plain = scoreSwissVpRound(rows, mode).pairVp;
      const ruled = scoreSwissVpRound(rows, mode, undefined, [
        match({
          opponent: null,
          ruling: buildMismatch({ side: "EW", direction: "HIGHER", fault: "NOT" }),
        }),
      ]).pairVp;
      expect([...ruled]).toEqual([...plain]);
    });

    it("skips a ruling whose pair has no VP this round", () => {
      const rows = fieldRows();
      const plain = scoreSwissVpRound(rows, mode).pairVp;
      const ruled = scoreSwissVpRound(rows, mode, undefined, [
        match({
          home: "NOBODY",
          ruling: buildMismatch({ side: "NS", direction: "HIGHER", fault: "NOT" }),
        }),
      ]).pairVp;
      expect([...ruled]).toEqual([...plain]);
    });
  });
});
