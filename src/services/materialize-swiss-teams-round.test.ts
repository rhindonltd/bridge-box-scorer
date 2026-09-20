import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

import {
  swissTeamsRoundOneSeed,
  swissTeamsRoundToMaterializable,
  materializeSwissTeamsRound,
} from "./materialize-swiss-teams-round";
import type { TeamsMatch } from "@/movement/swiss-teams/swiss-teams-pairing";
import { getDb } from "@/db/games";

/**
 * Build a mock per-game db whose idempotency guard resolves to `existingRows`,
 * and whose `transaction(cb)` runs the callback with a chainable tx.
 */
function stubDb(existingRows: unknown[]) {
  const run = vi.fn();
  const values = vi.fn(() => ({ run }));
  const insert = vi.fn(() => ({ values }));
  const tx = { insert };
  const transaction = vi.fn((cb: (tx: unknown) => void) => cb(tx));

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
    const out = swissTeamsRoundToMaterializable(2, 3, matches);

    expect(out.length).toBeGreaterThan(0);
    // Round 2, boards per round 3 -> boards 4..6.
    for (const table of out) {
      expect(table.rounds[0].roundNumber).toBe(2);
      expect(table.rounds[0].boardStart).toBe(4);
      expect(table.rounds[0].boardEnd).toBe(6);
      expect(table.rounds[0].ns).toMatch(/NS$/);
      expect(table.rounds[0].ew).toMatch(/EW$/);
    }
  });

  it("appends a SIT_OUT phantom row for the bye team on an odd field", () => {
    // Teams 1..5, team 5 byes; the played match is 1v2, plus a 3v4 (say).
    const oddMatches: TeamsMatch[] = [
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ];
    const out = swissTeamsRoundToMaterializable(1, 3, oddMatches, 5);

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
    const out = swissTeamsRoundToMaterializable(2, 3, matches, null);
    expect(out.every((t) => t.rounds[0].sitOut === undefined)).toBe(true);
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
      materializeSwissTeamsRound("missing", "A", 1, 3, matches),
    ).rejects.toThrow("Game db does not exist");
  });

  it("is a no-op when the round already has boards", async () => {
    const { db, transaction } = stubDb([{ n: 1 }]);
    vi.mocked(getDb).mockResolvedValue(db as any);

    const result = await materializeSwissTeamsRound("g1", "A", 1, 3, matches);

    expect(result).toEqual({ written: false });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("writes the round's rows inside a transaction", async () => {
    const { db, insert, values, run, transaction } = stubDb([]);
    vi.mocked(getDb).mockResolvedValue(db as any);

    const result = await materializeSwissTeamsRound("g1", "A", 1, 3, matches);

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
    const result = await materializeSwissTeamsRound("g1", "A", 2, 3, []);

    expect(result).toEqual({ written: true });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(insert).not.toHaveBeenCalled();
  });
});
