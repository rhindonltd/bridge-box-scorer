import { describe, it, expect, vi } from "vitest";
import {
  swissPairIdFromParticipant,
  getSwissBoardHistory,
} from "./swiss-board-history";
import { opponentKey } from "@/movement/swiss/swiss-pairing";

/** A db whose `select().from().where()` resolves to `rows`. */
function stubDb(rows: unknown[]) {
  const where = vi.fn(() => Promise.resolve(rows));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { select } as never;
}

const TABLES = 3;

describe("swissPairIdFromParticipant", () => {
  it("decodes a valid section-qualified home seat to a stable pair id", () => {
    // Table 1 NS is pair 1.
    expect(swissPairIdFromParticipant("A1NS", TABLES)).toBe(1);
    // Table 1 EW is pair tables + 1.
    expect(swissPairIdFromParticipant("A1EW", TABLES)).toBe(TABLES + 1);
  });

  it("returns null for a non-seat participant (e.g. a sit-out phantom)", () => {
    expect(swissPairIdFromParticipant("SIT_OUT", TABLES)).toBeNull();
  });
});

describe("getSwissBoardHistory", () => {
  it("records opponents, direction counts and the highest round from played rows", async () => {
    const rows = [
      { roundNumber: 1, ns: "A1NS", ew: "A2EW", status: "PLAYED" },
      // A second board row in the same round/seating must NOT double-count.
      { roundNumber: 1, ns: "A1NS", ew: "A2EW", status: "PLAYED" },
      { roundNumber: 2, ns: "A2NS", ew: "A1EW", status: "PLAYED" },
    ];

    const history = await getSwissBoardHistory(stubDb(rows), "A", TABLES);

    const p1 = swissPairIdFromParticipant("A1NS", TABLES)!;
    const p2ew = swissPairIdFromParticipant("A2EW", TABLES)!;
    expect(history.playedOpponents.has(opponentKey(p1, p2ew))).toBe(true);
    expect(history.highestRound).toBe(2);
    // Pair 1 sat NS once (deduped across the two round-1 rows).
    expect(history.directionCounts.get(p1)).toEqual({ ns: 1, ew: 0 });
  });

  it("records a bye for both resolvable ids on a SIT_OUT row and no opponent", async () => {
    const rows = [
      { roundNumber: 1, ns: "A1NS", ew: "A2EW", status: "SIT_OUT" },
    ];

    const history = await getSwissBoardHistory(stubDb(rows), "A", TABLES);

    const nsId = swissPairIdFromParticipant("A1NS", TABLES)!;
    const ewId = swissPairIdFromParticipant("A2EW", TABLES)!;
    expect(history.hadBye.has(nsId)).toBe(true);
    expect(history.hadBye.has(ewId)).toBe(true);
    expect(history.playedOpponents.size).toBe(0);
    expect(history.directionCounts.size).toBe(0);
  });

  it("skips phantom (unparseable) seats on both played and sit-out rows", async () => {
    const rows = [
      // NS resolves, EW phantom: exercises the EW-null path.
      { roundNumber: 1, ns: "A1NS", ew: "PHANTOM", status: "PLAYED" },
      // EW resolves, NS phantom: exercises the NS-null path on a played row.
      { roundNumber: 2, ns: "PHANTOM", ew: "A2EW", status: "PLAYED" },
      { roundNumber: 3, ns: "PHANTOM", ew: "PHANTOM", status: "SIT_OUT" },
    ];

    const history = await getSwissBoardHistory(stubDb(rows), "A", TABLES);

    // No opponents recorded (each row has an unresolved seat), and only the
    // resolvable side of each row is bumped in its own direction.
    expect(history.playedOpponents.size).toBe(0);
    const nsId = swissPairIdFromParticipant("A1NS", TABLES)!;
    const ewId = swissPairIdFromParticipant("A2EW", TABLES)!;
    expect(history.directionCounts.get(nsId)).toEqual({ ns: 1, ew: 0 });
    expect(history.directionCounts.get(ewId)).toEqual({ ns: 0, ew: 1 });
    expect(history.hadBye.size).toBe(0);
  });

  it("bumps only the NS direction on a played row whose EW seat is a phantom", async () => {
    // nsId resolves, ewId is null: exercises the `ewId != null` guard's false
    // branch on the EW bump.
    const rows = [
      { roundNumber: 1, ns: "A1NS", ew: "SIT_OUT", status: "PLAYED" },
    ];

    const history = await getSwissBoardHistory(stubDb(rows), "A", TABLES);

    const nsId = swissPairIdFromParticipant("A1NS", TABLES)!;
    expect(history.directionCounts.get(nsId)).toEqual({ ns: 1, ew: 0 });
    expect(history.playedOpponents.size).toBe(0);
  });

  it("returns empty history for a section with no boards", async () => {
    const history = await getSwissBoardHistory(stubDb([]), "A", TABLES);
    expect(history.highestRound).toBe(0);
    expect(history.playedOpponents.size).toBe(0);
  });

  it("recovers a 2-half-matches group: the anchor (two opponents at one table) and both non-anchors (HALF_AVERAGE)", async () => {
    // Round 1 half-match at table 1: anchor A1NS plays A2NS (half 1, boards 1-2)
    // then A1EW (half 2, boards 3-4). The two non-anchors are compensated on the
    // half they missed via HALF_AVERAGE rows.
    const rows = [
      // Anchor's two real halves at table 1 (two DIFFERENT opponents).
      { roundNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2NS", status: "CONFIRMED" },
      { roundNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2NS", status: "CONFIRMED" },
      { roundNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A1EW", status: "CONFIRMED" },
      { roundNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A1EW", status: "CONFIRMED" },
      // Compensation blocks: A2NS missed half 2, A1EW missed half 1.
      { roundNumber: 1, tableNumber: 7, ns: "A2NS", ew: "PHANTOM", status: "HALF_AVERAGE" },
      { roundNumber: 1, tableNumber: 8, ns: "A1EW", ew: "PHANTOM", status: "HALF_AVERAGE" },
    ];

    const history = await getSwissBoardHistory(stubDb(rows), "A", TABLES);

    const anchor = swissPairIdFromParticipant("A1NS", TABLES)!; // 1
    const nonAnchorNs = swissPairIdFromParticipant("A2NS", TABLES)!; // 2
    const nonAnchorEw = swissPairIdFromParticipant("A1EW", TABLES)!; // 4

    expect(history.hadHalfMatch.has(anchor)).toBe(true);
    expect(history.hadHalfMatch.has(nonAnchorNs)).toBe(true);
    expect(history.hadHalfMatch.has(nonAnchorEw)).toBe(true);
    // A HALF_AVERAGE row is not a bye and not a played opponent.
    expect(history.hadBye.size).toBe(0);
  });

  it("does not flag an ordinary one-opponent round as a half-match", async () => {
    const rows = [
      { roundNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", status: "CONFIRMED" },
      { roundNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", status: "CONFIRMED" },
    ];

    const history = await getSwissBoardHistory(stubDb(rows), "A", TABLES);
    expect(history.hadHalfMatch.size).toBe(0);
  });
});
