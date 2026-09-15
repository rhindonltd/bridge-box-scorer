// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { assignments } from "@/db/games/tables/assignments";
import { eq, and } from "drizzle-orm";

/**
 * Integration coverage for the incremental Swiss round materializer against a
 * real migrated per-game database: each call appends exactly one round's boards
 * (and only round 1's assignments), writes sit-out rows correctly, and is
 * idempotent per round.
 *
 * A Swiss pair's participant id is its round-1 home seat: with 2 tables, pair 1
 * -> A1NS, pair 2 -> A2NS, pair 3 -> A1EW, pair 4 -> A2EW.
 */
describe("materializeSwissRound", () => {
  let harness: DbHarness;
  const TABLES = 2;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it("appends round 1 boards and assignments (positional seating)", async () => {
    const { materializeSwissRound } = await import(
      "@/services/materialize-swiss-round"
    );
    const db = (await harness.getDb()) as Db;

    // 2 tables, boards per round 3. Round 1 positional: T1 (1 vs 3), T2 (2 vs 4).
    await materializeSwissRound(
      harness.gameId,
      "A",
      TABLES,
      1,
      3,
      [
        { tableNumber: 1, ns: 1, ew: 3 },
        { tableNumber: 2, ns: 2, ew: 4 },
      ],
      null,
    );

    const rows = await db.select().from(boards).where(eq(boards.section, "A"));

    // 2 tables * 3 boards = 6 board rows, boards 1..3.
    expect(rows).toHaveLength(6);
    expect(new Set(rows.map((r) => r.boardNumber))).toEqual(new Set([1, 2, 3]));
    const t1 = rows.filter((r) => r.tableNumber === 1);
    // Pair 1 -> A1NS, pair 3 -> A1EW (home seats).
    expect(t1[0].ns).toBe("A1NS");
    expect(t1[0].ew).toBe("A1EW");
    expect(rows.every((r) => r.status === "NOT_PLAYED")).toBe(true);

    // Round 1 seeds the assignment seat map (4 pairs), keyed by home seat.
    const assigns = await db.select().from(assignments);
    expect(assigns).toHaveLength(4);
    expect(assigns.map((a) => a.id).sort()).toEqual([
      "A1EW",
      "A1NS",
      "A2EW",
      "A2NS",
    ]);
  });

  it("appends a later round's boards with the correct board range and no assignments", async () => {
    const { materializeSwissRound } = await import(
      "@/services/materialize-swiss-round"
    );
    const db = (await harness.getDb()) as Db;

    // Round 2 with boards per round 3 -> boards 4..6.
    await materializeSwissRound(
      harness.gameId,
      "A",
      TABLES,
      2,
      3,
      [
        { tableNumber: 1, ns: 1, ew: 4 },
        { tableNumber: 2, ns: 2, ew: 3 },
      ],
      null,
    );

    const rows = await db
      .select()
      .from(boards)
      .where(and(eq(boards.section, "A"), eq(boards.roundNumber, 2)));

    expect(new Set(rows.map((r) => r.boardNumber))).toEqual(new Set([4, 5, 6]));

    // No assignments written for a non-first round.
    const assigns = await db.select().from(assignments);
    expect(assigns).toHaveLength(0);
  });

  it("writes SIT_OUT rows for the bye pair and records only the real pair", async () => {
    const { materializeSwissRound } = await import(
      "@/services/materialize-swiss-round"
    );
    const { getSwissBoardHistory } = await import(
      "@/db/games/queries/swiss-board-history"
    );
    const db = (await harness.getDb()) as Db;

    // 5 pairs at 2 tables + a spare: pairs 1v3, 2v4 play; pair 5 sits out.
    // Pair 5 = a third NS pair; with 3 tables its home seat is A3NS, but for a
    // 2-table draw we model the bye as pair id 5 which must map to a seat — use
    // TABLES=3 here so pair 5 -> A2EW is a valid seat.
    await materializeSwissRound(
      harness.gameId,
      "A",
      3, // 3 tables so pair 5 (id 5) maps to home seat A2EW
      1,
      2,
      [
        { tableNumber: 1, ns: 1, ew: 4 },
        { tableNumber: 2, ns: 2, ew: 6 },
      ],
      5,
    );

    const sitOutRows = await db
      .select()
      .from(boards)
      .where(and(eq(boards.section, "A"), eq(boards.status, "SIT_OUT")));

    expect(sitOutRows.length).toBe(2); // boards per round = 2
    // Pair 5 with 3 tables -> home seat A2EW.
    expect(sitOutRows.every((r) => r.ns === "A2EW")).toBe(true);

    // The bye is recovered; the phantom seat is not treated as a pair.
    const history = await getSwissBoardHistory(db, "A", 3);
    expect(history.hadBye).toEqual(new Set([5]));
  });

  it("is idempotent per round (a repeated draw does not duplicate boards)", async () => {
    const { materializeSwissRound } = await import(
      "@/services/materialize-swiss-round"
    );
    const db = (await harness.getDb()) as Db;

    const seating = [
      { tableNumber: 1, ns: 1, ew: 3 },
      { tableNumber: 2, ns: 2, ew: 4 },
    ];

    const first = await materializeSwissRound(
      harness.gameId,
      "A",
      TABLES,
      1,
      3,
      seating,
      null,
    );
    const second = await materializeSwissRound(
      harness.gameId,
      "A",
      TABLES,
      1,
      3,
      seating,
      null,
    );

    expect(first.written).toBe(true);
    expect(second.written).toBe(false);

    const rows = await db.select().from(boards).where(eq(boards.section, "A"));
    expect(rows).toHaveLength(6);
  });
});
