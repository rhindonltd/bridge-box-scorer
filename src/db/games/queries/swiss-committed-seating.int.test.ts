// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import type { NewBoard } from "@/db/games/tables/boards";
import type { BoardOutcome } from "@/model/score";

/**
 * Integration coverage for `getSwissCommittedRound`'s half-match / bye handling:
 * the three pairs of a 2-half-matches group and the bye pair are collected into
 * `excludedPairs` (not diffed), while the ORDINARY tables of the same round
 * stay in `opponentByPair`. This is the per-participant granularity §3.5
 * detection relies on so a half-match round is not skipped wholesale.
 *
 * With TABLES = 4, a Swiss pair's round-1 home seat decodes to its stable id:
 * A1NS→1, A2NS→2, A3NS→3, A4NS→4, A1EW→5, A2EW→6, A3EW→7, A4EW→8.
 */
describe("getSwissCommittedRound — half-match / bye exclusion", () => {
  let harness: DbHarness;
  const TABLES = 4;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });
  afterEach(() => {
    harness.teardown();
  });

  function board(overrides: Partial<NewBoard>): NewBoard {
    return {
      section: "A",
      roundNumber: 2,
      tableNumber: 1,
      boardNumber: 1,
      ns: "A1NS",
      ew: "A2EW",
      status: "CONFIRMED",
      confirmedResult: "3NTN=" as BoardOutcome,
      ...overrides,
    } as NewBoard;
  }

  it("excludes the half-match trio and the bye pair, keeps ordinary tables", async () => {
    const db = (await harness.getDb()) as Db;
    const { getSwissCommittedRound } = await import("./swiss-committed-seating");

    // Round 2 layout:
    //  - Table 1: ORDINARY — pair 1 (A1NS) vs pair 6 (A2EW).
    //  - Table 2: ANCHOR of a half-match group — pair 2 (A2NS) faces pair 7
    //    (A3EW) on board 3 and pair 8 (A4EW) on board 4 (two opponents at one
    //    table ⇒ anchor). So the group is {2, 7, 8}.
    //  - Pairs 7 and 8 each get a HALF_AVERAGE compensation row (the half each
    //    sat out), ns = the non-anchor, ew = a phantom.
    //  - Table 3: a SIT_OUT (bye) for pair 3 (A3NS).
    await db.insert(boards).values([
      // Ordinary table 1 (two boards).
      board({ tableNumber: 1, boardNumber: 1, ns: "A1NS", ew: "A2EW" }),
      board({ tableNumber: 1, boardNumber: 2, ns: "A1NS", ew: "A2EW" }),
      // Anchor table 2: pair 2 vs two different opponents across boards.
      board({ tableNumber: 2, boardNumber: 3, ns: "A2NS", ew: "A3EW" }),
      board({ tableNumber: 2, boardNumber: 4, ns: "A2NS", ew: "A4EW" }),
      // HALF_AVERAGE rows for the two non-anchors (phantom EW).
      board({
        tableNumber: 5,
        boardNumber: 3,
        ns: "A4EW",
        ew: "APHANTOM",
        status: "HALF_AVERAGE",
        confirmedResult: null,
      }),
      board({
        tableNumber: 6,
        boardNumber: 4,
        ns: "A3EW",
        ew: "APHANTOM",
        status: "HALF_AVERAGE",
        confirmedResult: null,
      }),
      // Bye for pair 3 (A3NS).
      board({
        tableNumber: 7,
        boardNumber: 1,
        ns: "A3NS",
        ew: "APHANTOM",
        status: "SIT_OUT",
        confirmedResult: null,
      }),
    ]);

    const committed = await getSwissCommittedRound(db, "A", TABLES, 2);

    // The half-match trio {2, 7, 8} and the bye pair {3} are excluded.
    expect([...committed.excludedPairs].sort((a, b) => a - b)).toEqual([
      2, 3, 7, 8,
    ]);
    expect(committed.sitOutPairId).toBe(3);

    // The ordinary table (1 vs 6) survives in the opponent map; no excluded
    // pair appears there.
    expect(committed.opponentByPair.get(1)).toBe(6);
    expect(committed.opponentByPair.get(6)).toBe(1);
    for (const excluded of [2, 3, 7, 8]) {
      expect(committed.opponentByPair.has(excluded)).toBe(false);
    }
  });
});
