import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

import {
  swissPairMovementId,
  swissRoundBoardRange,
  swissRoundToMaterializable,
  materializeSwissRound,
} from "./materialize-swiss-round";
import type { SwissSeating } from "@/movement/swiss/swiss-pairing";
import { getDb } from "@/db/games";

/**
 * Build a mock per-game db whose idempotency guard
 * (`select().from().where().limit()`) resolves to `existingRows`, and whose
 * `transaction(cb)` invokes the callback synchronously with a tx exposing a
 * chainable `insert().values().run()`.
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

describe("swissPairMovementId", () => {
  it("maps a pair id to its round-1 home seat id (2 tables)", () => {
    // pair 1 -> 1NS, pair 2 -> 2NS, pair 3 -> 1EW, pair 4 -> 2EW.
    expect(swissPairMovementId(2, 1)).toBe("1NS");
    expect(swissPairMovementId(2, 2)).toBe("2NS");
    expect(swissPairMovementId(2, 3)).toBe("1EW");
    expect(swissPairMovementId(2, 4)).toBe("2EW");
  });
});

describe("swissRoundBoardRange", () => {
  it("grows the board range with the round number", () => {
    expect(swissRoundBoardRange(1, 3)).toEqual({ boardStart: 1, boardEnd: 3 });
    expect(swissRoundBoardRange(2, 3)).toEqual({ boardStart: 4, boardEnd: 6 });
    expect(swissRoundBoardRange(3, 2)).toEqual({ boardStart: 5, boardEnd: 6 });
  });
});

describe("swissRoundToMaterializable", () => {
  const seating: SwissSeating[] = [
    { tableNumber: 1, ns: 1, ew: 3 },
    { tableNumber: 2, ns: 2, ew: 4 },
  ];

  it("emits one table per seating entry with the round's board range and no sit-out", () => {
    const out = swissRoundToMaterializable(2, 1, 3, seating, null);

    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      tableNumber: 1,
      rounds: [
        { roundNumber: 1, ns: "1NS", ew: "1EW", boardStart: 1, boardEnd: 3 },
      ],
    });
    expect(out.some((t) => t.rounds[0].sitOut)).toBe(false);
  });

  it("appends a flagged sit-out table on the next free table number", () => {
    const out = swissRoundToMaterializable(3, 1, 2, seating, 5);

    expect(out).toHaveLength(3);
    const sitOut = out[out.length - 1];
    expect(sitOut.tableNumber).toBe(3);
    expect(sitOut.rounds[0].sitOut).toBe(true);
    expect(sitOut.rounds[0].ns).toBe("2EW"); // pair 5 with 3 tables
    expect(sitOut.rounds[0].ew).toBe("PHANTOM");
  });
});

describe("materializeSwissRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const seating: SwissSeating[] = [
    { tableNumber: 1, ns: 1, ew: 3 },
    { tableNumber: 2, ns: 2, ew: 4 },
  ];

  it("throws when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(undefined as any);

    await expect(
      materializeSwissRound("missing", "A", 2, 1, 3, seating, null),
    ).rejects.toThrow("Game db does not exist");
  });

  it("is a no-op when the round already has boards", async () => {
    const { db, transaction } = stubDb([{ n: 1 }]);
    vi.mocked(getDb).mockResolvedValue(db as any);

    const result = await materializeSwissRound(
      "g1",
      "A",
      2,
      1,
      3,
      seating,
      null,
    );

    expect(result).toEqual({ written: false });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("writes the round's board and assignment rows inside a transaction", async () => {
    const { db, insert, values, run, transaction } = stubDb([]);
    vi.mocked(getDb).mockResolvedValue(db as any);

    const result = await materializeSwissRound(
      "g1",
      "A",
      2,
      1,
      3,
      seating,
      null,
    );

    expect(result).toEqual({ written: true });
    expect(transaction).toHaveBeenCalledTimes(1);
    // Round 1 writes both board rows and assignment rows.
    expect(insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
  });

  it("runs the transaction but inserts nothing when there are no rows to write", async () => {
    const { db, insert, transaction } = stubDb([]);
    vi.mocked(getDb).mockResolvedValue(db as any);

    // Empty seating on a later round -> no board rows and (round > 1) no
    // assignment rows, so both insert guards inside the transaction are false.
    const result = await materializeSwissRound("g1", "A", 2, 2, 3, [], null);

    expect(result).toEqual({ written: true });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(insert).not.toHaveBeenCalled();
  });
});
