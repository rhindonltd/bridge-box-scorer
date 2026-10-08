import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

import {
  swissTeamsRoundOneSeed,
  swissTeamsRoundToMaterializable,
  tripleBoardSets,
  materializeSwissTeamsRound,
} from "./materialize-swiss-teams-round";
import type {
  TeamsMatch,
  TeamsTriple,
} from "@/movement/swiss-teams/swiss-teams-pairing";
import { getDb } from "@/db/games";

/**
 * Build a mock per-game db whose idempotency guard resolves to `existingRows`,
 * and whose `transaction(cb)` runs the callback with a chainable tx.
 */
function stubDb(existingRows: unknown[]) {
  // Each insert().values().run() returns an incrementing lastInsertRowid, so
  // the match→board id resolution in insertSectionDrafts has real ids to use.
  let nextId = 0;
  const run = vi.fn(() => ({ lastInsertRowid: ++nextId }));
  const values = vi.fn(() => ({ run }));
  const insert = vi.fn(() => ({ values }));
  const tx = { insert };
  const transaction = vi.fn((cb: (tx: unknown) => unknown) => cb(tx));

  const selectChain = {
    from: () => selectChain,
    where: () => selectChain,
    limit: () => Promise.resolve(existingRows),
  };
  const select = vi.fn(() => selectChain);

  return { db: { select, transaction }, insert, values, run, transaction };
}

describe("swissTeamsRoundOneSeed", () => {
  it("is deterministic for the same gameId + section", () => {
    expect(swissTeamsRoundOneSeed("g1", "A")).toBe(
      swissTeamsRoundOneSeed("g1", "A"),
    );
  });

  it("differs by section and by game", () => {
    expect(swissTeamsRoundOneSeed("g1", "A")).not.toBe(
      swissTeamsRoundOneSeed("g1", "B"),
    );
    expect(swissTeamsRoundOneSeed("g1", "A")).not.toBe(
      swissTeamsRoundOneSeed("g2", "A"),
    );
  });

  it("returns an unsigned 32-bit integer", () => {
    const seed = swissTeamsRoundOneSeed("game-xyz", "C");
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });
});

describe("swissTeamsRoundToMaterializable", () => {
  const matches: TeamsMatch[] = [
    { a: 1, b: 2 },
    { a: 3, b: 4 },
  ];

  it("expands each match into physical tables with home NS / away EW ids", () => {
    // Round 2 of a 5-round, 3-boards-per-round event -> boards 4..6.
    const out = swissTeamsRoundToMaterializable(2, 3, 5, matches);

    expect(out.length).toBeGreaterThan(0);
    for (const table of out) {
      expect(table.rounds[0].roundNumber).toBe(2);
      expect(table.rounds[0].boardStart).toBe(4);
      expect(table.rounds[0].boardEnd).toBe(6);
      expect(table.rounds[0].ns).toMatch(/NS$/);
      expect(table.rounds[0].ew).toMatch(/EW$/);
    }
  });

  it("appends a SIT_OUT phantom row for the bye team on an odd field", () => {
    // Teams 1..5, team 5 byes; the played matches are 1v2 and 3v4.
    const oddMatches: TeamsMatch[] = [
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ];
    const out = swissTeamsRoundToMaterializable(1, 3, 5, oddMatches, 5);

    const byeTable = out.find((t) => t.tableNumber === 5);
    expect(byeTable).toBeDefined();
    expect(byeTable!.rounds[0]).toMatchObject({
      roundNumber: 1,
      ns: "5NS",
      ew: "PHANTOM",
      sitOut: true,
      boardStart: 1,
      boardEnd: 3,
    });

    // The played tables are not flagged sitOut.
    for (const table of out.filter((t) => t.tableNumber !== 5)) {
      expect(table.rounds[0].sitOut).toBeUndefined();
    }
    // Tables are returned in ascending table-number order.
    expect(out.map((t) => t.tableNumber)).toEqual(
      [...out.map((t) => t.tableNumber)].sort((x, y) => x - y),
    );
  });

  it("adds no sit-out row for an even field (null bye)", () => {
    const out = swissTeamsRoundToMaterializable(2, 3, 5, matches, null);
    expect(out.every((t) => t.rounds[0].sitOut === undefined)).toBe(true);
  });

  it("lays a SHORT triple out as three head-to-head comparisons on sets A/B/C", () => {
    // Teams 1..5: a normal 1v2, plus a SHORT triple {3,4,5}. Round 1 of a
    // 4-round, 6-boards-per-round event. halfSize = 3; A = boards 1..3,
    // B = 4..6, C = fresh band above 4*6=24 -> 25..27.
    const triple: TeamsTriple = {
      a: 3,
      b: 4,
      c: 5,
      kind: "SHORT",
      group: null,
      slot: null,
    };
    const out = swissTeamsRoundToMaterializable(1, 6, 4, [{ a: 1, b: 2 }], null, triple);

    // Collect every (table, ns, ew, boardStart, boardEnd) row for the triple
    // tables (3, 4, 5).
    const tripleRows = out
      .filter((t) => t.tableNumber >= 3)
      .flatMap((t) =>
        t.rounds.map((r) => ({
          table: t.tableNumber,
          ns: r.ns,
          ew: r.ew,
          start: r.boardStart,
          end: r.boardEnd,
        })),
      );

    // Comparison x-y (3-4) on set A (1..3): rooms 3-NS/4-EW and 4-NS/3-EW.
    expect(tripleRows).toContainEqual({ table: 3, ns: "3NS", ew: "4EW", start: 1, end: 3 });
    expect(tripleRows).toContainEqual({ table: 4, ns: "4NS", ew: "3EW", start: 1, end: 3 });
    // Comparison y-z (4-5) on set B (4..6): rooms 4-NS/5-EW and 5-NS/4-EW.
    expect(tripleRows).toContainEqual({ table: 4, ns: "4NS", ew: "5EW", start: 4, end: 6 });
    expect(tripleRows).toContainEqual({ table: 5, ns: "5NS", ew: "4EW", start: 4, end: 6 });
    // Comparison z-x (3-5) on set C (25..27): rooms 5-NS/3-EW and 3-NS/5-EW.
    expect(tripleRows).toContainEqual({ table: 5, ns: "5NS", ew: "3EW", start: 25, end: 27 });
    expect(tripleRows).toContainEqual({ table: 3, ns: "3NS", ew: "5EW", start: 25, end: 27 });

    // Exactly six triple rows, none a sit-out.
    expect(tripleRows).toHaveLength(6);
    expect(out.every((t) => t.rounds.every((r) => r.sitOut === undefined))).toBe(true);

    // No (table, board) is used twice across the whole round (no board repeat).
    const seen = new Set<string>();
    for (const t of out) {
      for (const r of t.rounds) {
        for (let b = r.boardStart; b <= r.boardEnd; b++) {
          const key = `${t.tableNumber}:${b}`;
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      }
    }
  });

  it("materializes a LONG triple's slot 1 (round R) as the half-1 rooms on sets A/B/C", () => {
    // LONG triple {3,4,5}, first round 1, 6 full boards, 4-round event.
    // A = round 1 (1..6), B = round 2 (7..12), C = fresh full set 25..30.
    // Slot 1 (round 1) plays the half-1 rooms: x·NS v y (A), y·NS v z (B),
    // z·NS v x (C).
    const triple: TeamsTriple = {
      a: 3,
      b: 4,
      c: 5,
      kind: "LONG",
      group: 1,
      slot: 1,
    };
    const out = swissTeamsRoundToMaterializable(1, 6, 4, [{ a: 1, b: 2 }], null, triple);

    const tripleRows = out
      .filter((t) => t.tableNumber >= 3)
      .flatMap((t) =>
        t.rounds.map((r) => ({
          table: t.tableNumber,
          round: r.roundNumber,
          ns: r.ns,
          ew: r.ew,
          start: r.boardStart,
          end: r.boardEnd,
        })),
      );

    expect(tripleRows).toEqual(
      expect.arrayContaining([
        { table: 3, round: 1, ns: "3NS", ew: "4EW", start: 1, end: 6 }, // x·NS v y on A
        { table: 4, round: 1, ns: "4NS", ew: "5EW", start: 7, end: 12 }, // y·NS v z on B
        { table: 5, round: 1, ns: "5NS", ew: "3EW", start: 25, end: 30 }, // z·NS v x on C
      ]),
    );
    expect(tripleRows).toHaveLength(3);
  });

  it("materializes a LONG triple's slot 2 (round R+1) as the half-2 rooms on the SAME sets A/B/C", () => {
    // Same LONG triple, slot 2 (round 2). The half-2 rooms sit on the SAME sets
    // as slot 1 (so each comparison IMPs on one set): y·NS v x (A, 1..6),
    // z·NS v y (B, 7..12), x·NS v z (C, 25..30) — tagged round 2.
    const triple: TeamsTriple = {
      a: 3,
      b: 4,
      c: 5,
      kind: "LONG",
      group: 1,
      slot: 2,
    };
    const out = swissTeamsRoundToMaterializable(2, 6, 4, [{ a: 1, b: 2 }], null, triple);

    const tripleRows = out
      .filter((t) => t.tableNumber >= 3)
      .flatMap((t) =>
        t.rounds.map((r) => ({
          table: t.tableNumber,
          round: r.roundNumber,
          ns: r.ns,
          ew: r.ew,
          start: r.boardStart,
          end: r.boardEnd,
        })),
      );

    expect(tripleRows).toEqual(
      expect.arrayContaining([
        { table: 4, round: 2, ns: "4NS", ew: "3EW", start: 1, end: 6 }, // y·NS v x on A
        { table: 5, round: 2, ns: "5NS", ew: "4EW", start: 7, end: 12 }, // z·NS v y on B
        { table: 3, round: 2, ns: "3NS", ew: "5EW", start: 25, end: 30 }, // x·NS v z on C
      ]),
    );
    expect(tripleRows).toHaveLength(3);
  });
});

describe("tripleBoardSets", () => {
  it("SHORT: A/B are the round's two halves and C a fresh half-set beyond all rounds", () => {
    // Round 1, 6 boards, 4 rounds: halfSize 3; A 1..3, B 4..6, C = 24 + 0 + 1.
    expect(tripleBoardSets("SHORT", 1, 6, 4)).toEqual({
      A: { start: 1, end: 3 },
      B: { start: 4, end: 6 },
      C: { start: 25, end: 27 },
    });
  });

  it("SHORT: every triple shares the same C band (round only shifts A/B)", () => {
    // First round 3, 6 boards, 4 rounds: A 13..15, B 16..18; C is the SAME
    // shared band as round 1's triple (24 + 1 = 25..27).
    expect(tripleBoardSets("SHORT", 3, 6, 4)).toEqual({
      A: { start: 13, end: 15 },
      B: { start: 16, end: 18 },
      C: { start: 25, end: 27 },
    });
  });

  it("SHORT: drops the odd board when splitting an odd round into halves", () => {
    // 7 boards, round 1, 4 rounds: halfSize 3; A 1..3, B 4..6 (board 7 dropped);
    // C = 4*7 + 0 + 1 = 29..31.
    expect(tripleBoardSets("SHORT", 1, 7, 4)).toEqual({
      A: { start: 1, end: 3 },
      B: { start: 4, end: 6 },
      C: { start: 29, end: 31 },
    });
  });

  it("LONG: A = round R's full range, B = round R+1's, C a fresh full set beyond all rounds", () => {
    // First round 1, 6 boards, 4 rounds: A 1..6, B 7..12, C = 24 + 0 + 1 = 25..30.
    expect(tripleBoardSets("LONG", 1, 6, 4)).toEqual({
      A: { start: 1, end: 6 },
      B: { start: 7, end: 12 },
      C: { start: 25, end: 30 },
    });
  });

  it("returns null for a SHORT round too short to split", () => {
    expect(tripleBoardSets("SHORT", 1, 1, 4)).toBeNull();
  });
});

describe("materializeSwissTeamsRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const matches: TeamsMatch[] = [
    { a: 1, b: 2 },
    { a: 3, b: 4 },
  ];

  it("throws when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(undefined as any);

    await expect(
      materializeSwissTeamsRound("missing", "A", 1, 3, 5, matches),
    ).rejects.toThrow("Game db does not exist");
  });

  it("is a no-op when the round already has boards", async () => {
    const { db, transaction } = stubDb([{ n: 1 }]);
    vi.mocked(getDb).mockResolvedValue(db as any);

    const result = await materializeSwissTeamsRound("g1", "A", 1, 3, 5, matches);

    expect(result).toEqual({ written: false });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("writes the round's rows inside a transaction", async () => {
    const { db, insert, values, run, transaction } = stubDb([]);
    vi.mocked(getDb).mockResolvedValue(db as any);

    const result = await materializeSwissTeamsRound("g1", "A", 1, 3, 5, matches);

    expect(result).toEqual({ written: true });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
  });

  it("runs the transaction but inserts nothing when there are no rows to write", async () => {
    const { db, insert, transaction } = stubDb([]);
    vi.mocked(getDb).mockResolvedValue(db as any);

    // Empty matches on a later round -> no board or assignment rows, so both
    // insert guards inside the transaction take the false branch.
    const result = await materializeSwissTeamsRound("g1", "A", 2, 3, 5, []);

    expect(result).toEqual({ written: true });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(insert).not.toHaveBeenCalled();
  });
});
