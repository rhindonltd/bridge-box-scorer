// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { matches } from "@/db/games/tables/matches";
import { boards } from "@/db/games/tables/boards";
import { makeBoard } from "@/mocks/fixtures/db-rows";
/**
 * Edge cases for getSwissCommittedRound: match rows whose participant ids are
 * not real Swiss pairs, matches with no board rows, and a pairs match whose
 * opponent is separately excluded.
 */
describe("getSwissCommittedRound — edge cases", () => {
  let harness: DbHarness;
  let db: Db;
  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    db = (await harness.getDb()) as Db;
  });
  afterEach(() => {
    harness.teardown();
  });
  const base = {
    section: "A",
    roundNumber: 1,
    scoredAsUnit: false,
    boardStart: 1,
    boardEnd: 1,
  } as const;
  it("returns an empty seating for a round with no ordinary pairs matches", async () => {
    const { getSwissCommittedRound } = await import(
      "@/db/games/queries/swiss-committed-seating"
    );
    const round = await getSwissCommittedRound(db, "A", 4, 1);
    expect(round.tables).toEqual([]);
    expect(round.sitOutPairId).toBeNull();
    expect(round.excludedPairs.size).toBe(0);
  });
  it("skips non-pair ids and falls back to table 0 when a match has no boards", async () => {
    db.insert(matches)
      .values([
        { ...base, id: 1, kind: "BYE", home: "APHANTOM", opponent: null },
        { ...base, id: 2, kind: "HALF_MATCH", home: "APHANTOM", opponent: null },
        { ...base, id: 3, kind: "PAIRS", home: "A1", opponent: "A2" },
        { ...base, id: 4, kind: "PAIRS", home: "A3", opponent: "A4" },
        { ...base, id: 5, kind: "PAIRS", home: "APHANTOM", opponent: "A5" },
        { ...base, id: 6, kind: "PAIRS", home: "A6", opponent: null },
        // Pair 2 is also part of a half-match group, so it is excluded and
        // pair 1 (whose recorded opponent it is) drops out with it.
        { ...base, id: 7, kind: "HALF_MATCH", home: "A2", opponent: null },
      ])
      .run();
    db.insert(boards)
      .values(makeBoard({ matchId: 3, tableNumber: 5, ns: "A1", ew: "A2" }))
      .run();
    const { getSwissCommittedRound } = await import(
      "@/db/games/queries/swiss-committed-seating"
    );
    const round = await getSwissCommittedRound(db, "A", 4, 1);
    expect(round.sitOutPairId).toBeNull();
    expect([...round.excludedPairs]).toEqual([2]);
    expect(round.tables).toEqual([
      { tableNumber: 0, ns: 3, ew: 4 },
      { tableNumber: 5, ns: 1, ew: 2 },
    ]);
    expect([...round.opponentByPair.entries()].sort()).toEqual([
      [3, 4],
      [4, 3],
    ]);
  });
});
