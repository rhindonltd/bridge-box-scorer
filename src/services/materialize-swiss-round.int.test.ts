// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { eq, and } from "drizzle-orm";

/**
 * Integration coverage for the incremental Swiss round materializer against a
 * real migrated per-game database: each call appends exactly one round's boards,
 * writes sit-out rows correctly, and is idempotent per round. (Seats are no
 * longer written by the materialiser — a pair's `seat_occupancy` is created
 * when the director seats it — so the board rows are the only output.)
 *
 * A Swiss pair's board id is its bare, direction-less pair number (NS pairs
 * 1..tables, EW pairs tables+1..2·tables). With 2 tables, pair 1 -> A1, pair 2
 * -> A2, pair 3 -> A3, pair 4 -> A4. (The physical round-1 chair A1NS lives on
 * the occupancy's seat, not the board.)
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

  it("appends round 1 boards (positional seating)", async () => {
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
    // Pair 1 -> A1, pair 3 -> A3 (bare pair ids).
    expect(t1[0].ns).toBe("A1");
    expect(t1[0].ew).toBe("A3");
    expect(rows.every((r) => r.status === "NOT_PLAYED")).toBe(true);
  });

  it("appends a later round's boards with the correct board range", async () => {
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
    // Use TABLES=3 so pair id 5 is a valid pair; its board id is the bare "A5".
    await materializeSwissRound(
      harness.gameId,
      "A",
      3, // 3 tables so pair id 5 is valid (board id "A5")
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
    // Sit-out pair 5 -> bare board id A5.
    expect(sitOutRows.every((r) => r.ns === "A5")).toBe(true);

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
