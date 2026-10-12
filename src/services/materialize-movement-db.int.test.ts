// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import type { MaterializableMovement } from "@/services/materialize-movement";

/**
 * Integration coverage for the DB-writing paths of materialize-movement:
 * materializePairLikeMovement and materializeSections write board rows into a
 * real per-game database inside a transaction, and stamp each seated
 * occupancy's anchor id from the round-1 layout.
 */
describe("materialize-movement DB writers", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  const oneTableTwoRounds: MaterializableMovement = [
    {
      tableNumber: 1,
      rounds: [
        { roundNumber: 1, ns: "1", ew: "2", boardStart: 1, boardEnd: 2 },
        { roundNumber: 2, ns: "1", ew: "3", boardStart: 3, boardEnd: 4 },
      ],
    },
  ];

  it("materializePairLikeMovement writes boards and stamps round-1 anchors", async () => {
    const { materializePairLikeMovement } = await import(
      "@/services/materialize-movement"
    );
    const db = (await harness.getDb()) as Db;
    const { boards } = await import("@/db/games/tables/boards");
    const { seatOccupancy } = await import(
      "@/db/games/tables/seat-occupancy"
    );
    const { players } = await import("@/db/games/tables/players");
    const { eq } = await import("drizzle-orm");

    // Seat the round-1 pair (A1NS vs A1EW) before materialising. The bare
    // movement ids "1"/"2" become board ids "A1"/"A2".
    for (const seat of ["A1NS", "A1EW"]) {
      const p1 = db
        .insert(players)
        .values({ firstName: `${seat}a`, lastName: "x" })
        .returning()
        .get();
      const p2 = db
        .insert(players)
        .values({ firstName: `${seat}b`, lastName: "y" })
        .returning()
        .get();
      db.insert(seatOccupancy)
        .values({
          seat: seat as `${string}${number}NS` | `${string}${number}EW`,
          boards: null,
          player1: p1.id,
          player2: p2.id,
          secretKey: seat,
        })
        .run();
    }

    await materializePairLikeMovement("A", oneTableTwoRounds, harness.gameId);

    const boardRows = db.select().from(boards).all();
    // 2 rounds * 2 boards each = 4 board rows.
    expect(boardRows).toHaveLength(4);
    expect(boardRows.every((r) => r.section === "A")).toBe(true);
    expect(boardRows.every((r) => r.ns === "A1")).toBe(true);

    // Round 1 stamps the anchor id onto each seat's occupancy: NS -> A1, EW ->
    // A2 (the board ids). Round 2's EW ("3") is not a round-1 seat, so it is
    // never stamped.
    const anchorOf = (seat: string) =>
      db
        .select({ anchorId: seatOccupancy.anchorId })
        .from(seatOccupancy)
        .where(eq(seatOccupancy.seat, seat as `${string}${number}NS`))
        .get()?.anchorId;
    expect(anchorOf("A1NS")).toBe("A1");
    expect(anchorOf("A1EW")).toBe("A2");
  });

  it("materializeSections writes rows for every section in one call", async () => {
    const { materializeSections } = await import(
      "@/services/materialize-movement"
    );
    const db = (await harness.getDb()) as Db;
    const { boards } = await import("@/db/games/tables/boards");

    await materializeSections(harness.gameId, [
      { section: "A", movement: oneTableTwoRounds },
      { section: "B", movement: oneTableTwoRounds },
    ]);

    const boardRows = db.select().from(boards).all();
    const sections = new Set(boardRows.map((r) => r.section));
    expect(sections).toEqual(new Set(["A", "B"]));
    expect(boardRows).toHaveLength(8); // 4 per section.
  });

  it("throws when the game db does not exist", async () => {
    const { materializeSections } = await import(
      "@/services/materialize-movement"
    );
    await expect(
      materializeSections("no-such-game", [
        { section: "A", movement: oneTableTwoRounds },
      ]),
    ).rejects.toThrow(/Game db does not exist/);
  });
});
