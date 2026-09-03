// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import type { MaterializableMovement } from "@/services/materialize-movement";

/**
 * Integration coverage for the DB-writing paths of materialize-movement:
 * materializePairLikeMovement and materializeSections write board +
 * assignment rows into a real per-game database inside a transaction.
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

  it("materializePairLikeMovement writes boards and round-1 assignments", async () => {
    const { materializePairLikeMovement } = await import(
      "@/services/materialize-movement"
    );
    const db = (await harness.getDb()) as Db;
    const { boards } = await import("@/db/games/tables/boards");
    const { assignments } = await import("@/db/games/tables/assignments");

    await materializePairLikeMovement("A", oneTableTwoRounds, harness.gameId);

    const boardRows = db.select().from(boards).all();
    // 2 rounds * 2 boards each = 4 board rows.
    expect(boardRows).toHaveLength(4);
    expect(boardRows.every((r) => r.section === "A")).toBe(true);
    expect(boardRows.every((r) => r.ns === "A1")).toBe(true);

    const assignmentRows = db.select().from(assignments).all();
    // Only round 1 produces assignments: NS + EW.
    expect(assignmentRows).toEqual(
      expect.arrayContaining([
        { id: "A1", initialSeat: "A1NS" },
        { id: "A2", initialSeat: "A1EW" },
      ]),
    );
    expect(assignmentRows).toHaveLength(2);
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
