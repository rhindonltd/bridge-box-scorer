import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

import {
  swissPairMovementId,
  swissRoundBoardRange,
  swissRoundToMaterializable,
  swissHalfMatchBoardSplit,
  swissHalfMatchToMaterializable,
  materializeSwissRound,
} from "./materialize-swiss-round";
import type {
  SwissHalfMatchGroup,
  SwissSeating,
} from "@/movement/swiss/swiss-pairing";
import { buildSectionRows } from "./materialize-movement";
import { segmentsForPair } from "@/scoring/swiss/swiss-half-match";
import type { SwissVpBoardRow } from "@/scoring/swiss/swiss-vp-overall";
import { getDb } from "@/db/games";

/**
 * Build a mock per-game db whose idempotency guard
 * (`select().from().where().limit()`) resolves to `existingRows`, and whose
 * `transaction(cb)` invokes the callback synchronously with a tx exposing a
 * chainable `insert().values().run()`.
 */
function stubDb(existingRows: unknown[]) {
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
        {
          roundNumber: 1,
          ns: "1NS",
          ew: "1EW",
          boardStart: 1,
          boardEnd: 3,
          match: {
            kind: "PAIRS",
            scoredAsUnit: true,
            key: "1|t1",
            home: "1NS",
            opponent: "1EW",
            vpPool: 20,
          },
        },
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

// --- "2 half matches" materialization (Step 4) -------------------------------

describe("swissHalfMatchBoardSplit", () => {
  it("splits an even round down the middle", () => {
    expect(swissHalfMatchBoardSplit(1, 8)).toEqual({
      halfOne: { start: 1, end: 4 },
      halfTwo: { start: 5, end: 8 },
      halfSize: 4,
    });
  });

  it("rounds an odd round down, discarding the final board", () => {
    // 7-board round → two 3-board halves (board 7 dropped for the group).
    expect(swissHalfMatchBoardSplit(1, 7)).toEqual({
      halfOne: { start: 1, end: 3 },
      halfTwo: { start: 4, end: 6 },
      halfSize: 3,
    });
  });

  it("offsets by the round's board range", () => {
    // Round 2 of a 6-board round starts at board 7.
    expect(swissHalfMatchBoardSplit(2, 6)).toEqual({
      halfOne: { start: 7, end: 9 },
      halfTwo: { start: 10, end: 12 },
      halfSize: 3,
    });
  });

  it("returns null when there is less than one board per half", () => {
    expect(swissHalfMatchBoardSplit(1, 1)).toBeNull();
    expect(swissHalfMatchBoardSplit(1, 0)).toBeNull();
  });
});

describe("swissHalfMatchToMaterializable", () => {
  // 3-table event (6 pairs). Group: anchor=1 ("1NS"), halfOne=2 ("2NS"),
  // halfTwo=4 ("1EW"). Anchor seated NS at table 1; compensation parked at 7,8.
  const group: SwissHalfMatchGroup = {
    anchor: 1,
    halfOneOpponent: 2,
    halfTwoOpponent: 4,
  };

  it("seats both halves at the anchor's table, anchor fixed, opponents swapping", () => {
    const out = swissHalfMatchToMaterializable(3, 1, 8, group, { tableNumber: 1, anchorDirection: "NS" }, 7)!;
    const anchorTable = out[0];
    expect(anchorTable.tableNumber).toBe(1);
    expect(anchorTable.rounds).toHaveLength(2);
    // Half 1: anchor NS vs halfOneOpponent on boards 1-4.
    expect(anchorTable.rounds[0]).toMatchObject({ ns: "1NS", ew: "2NS", boardStart: 1, boardEnd: 4 });
    // Half 2: anchor NS vs halfTwoOpponent on boards 5-8.
    expect(anchorTable.rounds[1]).toMatchObject({ ns: "1NS", ew: "1EW", boardStart: 5, boardEnd: 8 });
  });

  it("compensates each non-anchor on the half it missed, as HALF_AVERAGE blocks", () => {
    const out = swissHalfMatchToMaterializable(3, 1, 8, group, { tableNumber: 1, anchorDirection: "NS" }, 7)!;
    const [, compOne, compTwo] = out;
    // halfOneOpponent (2 → "2NS") played S1, so is compensated on S2 (5-8).
    expect(compOne).toMatchObject({ tableNumber: 7 });
    expect(compOne.rounds[0]).toMatchObject({ ns: "2NS", ew: "PHANTOM", boardStart: 5, boardEnd: 8, halfAverage: true });
    // halfTwoOpponent (4 → "1EW") played S2, so is compensated on S1 (1-4).
    expect(compTwo).toMatchObject({ tableNumber: 8 });
    expect(compTwo.rounds[0]).toMatchObject({ ns: "1EW", ew: "PHANTOM", boardStart: 1, boardEnd: 4, halfAverage: true });
  });

  it("puts the anchor EW (opponents NS) when the anchor is seated EW", () => {
    const out = swissHalfMatchToMaterializable(3, 1, 8, group, { tableNumber: 1, anchorDirection: "EW" }, 7)!;
    expect(out[0].rounds[0]).toMatchObject({ ns: "2NS", ew: "1NS" });
    expect(out[0].rounds[1]).toMatchObject({ ns: "1EW", ew: "1NS" });
  });

  it("returns null for a round too short to split", () => {
    expect(swissHalfMatchToMaterializable(3, 1, 1, group, { tableNumber: 1, anchorDirection: "NS" }, 7)).toBeNull();
  });
});

describe("swissRoundToMaterializable — half-match round", () => {
  // A 4-table (8-pair) event. The group is {anchor 1, halfOne 2, halfTwo 5}.
  // The structural reconstruction only needs the group's own rows, so the
  // ordinary seating is left empty (the three group pairs are materialized by
  // the half-match path, never in `seating`).
  const group: SwissHalfMatchGroup = {
    anchor: 1,
    halfOneOpponent: 2,
    halfTwoOpponent: 5,
  };
  const emptySeating: SwissSeating[] = [];

  it("reconstructs into the scorer's segments: anchor two reals, each non-anchor one real + one compensation", () => {
    const movement = swissRoundToMaterializable(4, 1, 8, emptySeating, null, {
      group,
      seat: { tableNumber: 1, anchorDirection: "NS" },
    });

    const { boardRows } = buildSectionRows("A", movement);

    // The scorer consumes SwissVpBoardRow[]; the materialized NewBoard rows are
    // structurally compatible (section-qualified ids, status set).
    const rows = boardRows as unknown as SwissVpBoardRow[];
    const anchor = "A1NS";
    const oppOne = "A2NS"; // pair 2 → 2NS → A2NS
    const oppTwo = "A1EW"; // pair 5 (4 tables) → 1EW → A1EW

    const anchorSegs = segmentsForPair(anchor, rowsFor(rows, anchor));
    expect(anchorSegs).toHaveLength(2);
    expect(anchorSegs.every((s) => !s.compensation)).toBe(true);
    expect(anchorSegs.map((s) => s.opponent).sort()).toEqual([oppOne, oppTwo].sort());

    for (const nonAnchor of [oppOne, oppTwo]) {
      const segs = segmentsForPair(nonAnchor, rowsFor(rows, nonAnchor));
      expect(segs).toHaveLength(2);
      expect(segs.filter((s) => s.compensation)).toHaveLength(1);
      expect(segs.filter((s) => !s.compensation)).toHaveLength(1);
      // The real segment's opponent is the anchor.
      expect(segs.find((s) => !s.compensation)!.opponent).toBe(anchor);
    }
  });

  it("writes the compensation boards with status HALF_AVERAGE", () => {
    const movement = swissRoundToMaterializable(4, 1, 8, emptySeating, null, {
      group,
      seat: { tableNumber: 1, anchorDirection: "NS" },
    });
    const { boardRows } = buildSectionRows("A", movement);
    const halfAvg = boardRows.filter((r) => r.status === "HALF_AVERAGE");
    // Each non-anchor misses a 4-board half → 8 compensation rows total.
    expect(halfAvg).toHaveLength(8);
    expect(halfAvg.every((r) => r.ew === "APHANTOM")).toBe(true);
  });

  it("assigns the anchor a single round-1 seat despite playing two halves", () => {
    const movement = swissRoundToMaterializable(4, 1, 8, emptySeating, null, {
      group,
      seat: { tableNumber: 1, anchorDirection: "NS" },
    });
    const { assignmentRows } = buildSectionRows("A", movement);
    const anchorAssignments = assignmentRows.filter((a) => a.id === "A1NS");
    expect(anchorAssignments).toHaveLength(1);
    // Compensation (phantom) rows never seed an assignment.
    expect(assignmentRows.some((a) => a.id === "APHANTOM")).toBe(false);
  });
});

/** The materialized rows that reference `pairId` on either seat. */
function rowsFor(rows: SwissVpBoardRow[], pairId: string): SwissVpBoardRow[] {
  return rows.filter((r) => r.ns === pairId || r.ew === pairId);
}
