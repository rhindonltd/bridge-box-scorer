// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { makeBoard } from "@/mocks/fixtures/db-rows";
import type { NewBoard } from "@/db/games/tables/boards";
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

  async function seed(rows: NewBoard[]) {
    const { createBoard } = await import("@/db/games/actions/create-board");
    for (const row of rows) {
      await createBoard(harness.gameId, row);
    }
  }

  /** A Swiss board row: home-seat `ns` vs home-seat `ew` in section A. */
  function swissBoard(over: {
    round: number;
    table: number;
    board: number;
    ns: string;
    ew: string;
    status?: NewBoard["status"];
  }): NewBoard {
    return makeBoard({
      section: "A",
      roundNumber: over.round,
      tableNumber: over.table,
      boardNumber: over.board,
      ns: `A${over.ns}`,
      ew: `A${over.ew}`,
      status: over.status ?? "CONFIRMED",
    });
  }

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
    // 2 tables, 4 pairs. Round 1 positional (2 boards per round):
    //   T1: 1NS vs 1EW (pairs 1 & 3), T2: 2NS vs 2EW (pairs 2 & 4)
    // Round 2 re-seats: pair 1 (id 1) plays pair 4 (id 4); pair 2 plays pair 3.
    await seed([
      swissBoard({ round: 1, table: 1, board: 1, ns: "1NS", ew: "1EW" }),
      swissBoard({ round: 1, table: 1, board: 2, ns: "1NS", ew: "1EW" }),
      swissBoard({ round: 1, table: 2, board: 1, ns: "2NS", ew: "2EW" }),
      swissBoard({ round: 1, table: 2, board: 2, ns: "2NS", ew: "2EW" }),
      // Round 2: pair 1 (A1NS) sits NS vs pair 4 (A2EW); pair 2 (A2NS) vs pair 3 (A1EW).
      swissBoard({ round: 2, table: 1, board: 3, ns: "1NS", ew: "2EW" }),
      swissBoard({ round: 2, table: 1, board: 4, ns: "1NS", ew: "2EW" }),
      swissBoard({ round: 2, table: 2, board: 3, ns: "2NS", ew: "1EW" }),
      swissBoard({ round: 2, table: 2, board: 4, ns: "2NS", ew: "1EW" }),
    ]);

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

  it("records a bye from SIT_OUT rows and does not count them as opponents", async () => {
    // Pair 2 (A2NS) sits out round 1 with a phantom opponent.
    await seed([
      swissBoard({ round: 1, table: 1, board: 1, ns: "1NS", ew: "1EW" }),
      swissBoard({
        round: 1,
        table: 2,
        board: 2,
        ns: "2NS",
        ew: "PHANTOM",
        status: "SIT_OUT",
      }),
    ]);

    const { getSwissBoardHistory } = await import(
      "@/db/games/queries/swiss-board-history"
    );
    const db = (await harness.getDb()) as Db;

    const history = await getSwissBoardHistory(db, "A", TABLES);

    // A2NS is pair 2.
    expect(history.hadBye).toEqual(new Set([2]));
    // The phantom seat is not tracked as a pair or an opponent.
    expect(history.playedOpponents.size).toBe(1); // only the real T1 matchup
    expect(history.directionCounts.has(2)).toBe(false);
  });
});
