// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { opponentKey } from "@/movement/swiss/swiss-pairing";

/**
 * Integration coverage for getSwissBoardHistory against a real migrated per-game
 * database. A Swiss pair's stable id is its round-1 home seat, stored as the
 * section-qualified participant id on each board row (e.g. pair 1 -> "A1NS",
 * pair tables+1 -> "A1EW"). With 2 tables the pair ids are:
 *   1 = A1NS, 2 = A2NS, 3 = A1EW, 4 = A2EW.
 */
describe("getSwissBoardHistory", () => {
  let harness: DbHarness;
  const TABLES = 2;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it("returns empty history when there are no boards", async () => {
    const { getSwissBoardHistory } = await import(
      "@/db/games/queries/swiss-board-history"
    );
    const db = (await harness.getDb()) as Db;

    const history = await getSwissBoardHistory(db, "A", TABLES);
    expect(history.playedOpponents.size).toBe(0);
    expect(history.hadBye.size).toBe(0);
    expect(history.directionCounts.size).toBe(0);
    expect(history.highestRound).toBe(0);
  });

  it("derives opponents, direction counts, and highest round across two rounds", async () => {
    // 2 tables, 4 pairs, materialised through the real Swiss round writer (so
    // the first-class match rows the history reader now consults exist).
    //   Round 1: T1 pair1 vs pair3, T2 pair2 vs pair4.
    //   Round 2: pair1 vs pair4 (NS at T1), pair2 vs pair3 (NS at T2).
    const { materializeSwissRound } = await import(
      "@/services/materialize-swiss-round"
    );
    await materializeSwissRound(
      harness.gameId,
      "A",
      TABLES,
      1,
      2,
      [
        { tableNumber: 1, ns: 1, ew: 3 },
        { tableNumber: 2, ns: 2, ew: 4 },
      ],
      null,
    );
    await materializeSwissRound(
      harness.gameId,
      "A",
      TABLES,
      2,
      2,
      [
        { tableNumber: 1, ns: 1, ew: 4 },
        { tableNumber: 2, ns: 2, ew: 3 },
      ],
      null,
    );

    const { getSwissBoardHistory } = await import(
      "@/db/games/queries/swiss-board-history"
    );
    const db = (await harness.getDb()) as Db;

    const history = await getSwissBoardHistory(db, "A", TABLES);

    // Pair ids: A1NS=1, A2NS=2, A1EW=3, A2EW=4.
    expect(history.playedOpponents).toEqual(
      new Set([
        opponentKey(1, 3),
        opponentKey(2, 4),
        opponentKey(1, 4),
        opponentKey(2, 3),
      ]),
    );

    // Pair 1 (A1NS) sat NS both rounds; pair 3 (A1EW) sat EW both rounds.
    expect(history.directionCounts.get(1)).toEqual({ ns: 2, ew: 0 });
    expect(history.directionCounts.get(3)).toEqual({ ns: 0, ew: 2 });

    expect(history.highestRound).toBe(2);
    expect(history.hadBye.size).toBe(0);
  });

  it("records a bye and does not count the sitting pair as an opponent", async () => {
    // 3 pairs: T1 pair1 vs pair3, pair2 byes (materialised through the real
    // writer so the BYE match row exists).
    const { materializeSwissRound } = await import(
      "@/services/materialize-swiss-round"
    );
    await materializeSwissRound(
      harness.gameId,
      "A",
      TABLES,
      1,
      2,
      [{ tableNumber: 1, ns: 1, ew: 3 }],
      2,
    );

    const { getSwissBoardHistory } = await import(
      "@/db/games/queries/swiss-board-history"
    );
    const db = (await harness.getDb()) as Db;

    const history = await getSwissBoardHistory(db, "A", TABLES);

    // Pair 2 had the bye.
    expect(history.hadBye).toEqual(new Set([2]));
    // The phantom seat is not tracked as a pair or an opponent.
    expect(history.playedOpponents.size).toBe(1); // only the real T1 matchup
    expect(history.directionCounts.has(2)).toBe(false);
  });

  it("recovers a 2-half-matches group (anchor + both non-anchors) from the match rows", async () => {
    // A half-match group {anchor pair 1, non-anchors pairs 2 and 3} at table 1,
    // plus an ordinary table (pairs 4 v 7), round 1, 4 boards per round.
    const { materializeSwissRound } = await import(
      "@/services/materialize-swiss-round"
    );
    await materializeSwissRound(
      harness.gameId,
      "A",
      TABLES,
      1,
      4,
      [{ tableNumber: 2, ns: 4, ew: 7 }],
      null,
      {
        group: { anchor: 1, halfOneOpponent: 2, halfTwoOpponent: 3 },
        seat: { tableNumber: 1, anchorDirection: "NS" },
      },
    );

    const { getSwissBoardHistory } = await import(
      "@/db/games/queries/swiss-board-history"
    );
    const db = (await harness.getDb()) as Db;

    const history = await getSwissBoardHistory(db, "A", TABLES);

    // All three group pairs are recorded as having been in a half-match.
    expect(history.hadHalfMatch.has(1)).toBe(true);
    expect(history.hadHalfMatch.has(2)).toBe(true);
    expect(history.hadHalfMatch.has(3)).toBe(true);
    // The ordinary pairs were not in a half-match.
    expect(history.hadHalfMatch.has(4)).toBe(false);
    expect(history.hadBye.size).toBe(0);
  });

  it("does not flag an ordinary one-opponent round as a half-match", async () => {
    const { materializeSwissRound } = await import(
      "@/services/materialize-swiss-round"
    );
    await materializeSwissRound(
      harness.gameId,
      "A",
      TABLES,
      1,
      2,
      [
        { tableNumber: 1, ns: 1, ew: 3 },
        { tableNumber: 2, ns: 2, ew: 4 },
      ],
      null,
    );

    const { getSwissBoardHistory } = await import(
      "@/db/games/queries/swiss-board-history"
    );
    const db = (await harness.getDb()) as Db;

    const history = await getSwissBoardHistory(db, "A", TABLES);
    expect(history.hadHalfMatch.size).toBe(0);
  });
});
