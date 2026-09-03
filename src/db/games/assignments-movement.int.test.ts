// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import type { PairSeat } from "@/model/participants";

/**
 * Integration coverage for assignments (createAssignment), the section
 * movement round-trip (setSectionMovement / getSectionMovement) and the
 * highestOccupiedTableInSection guard query, against a real per-game database.
 */
describe("games db: assignments, movement, occupancy", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it("creates an assignment row", async () => {
    const { createAssignment } = await import(
      "@/db/games/actions/create-assignment"
    );
    await createAssignment(harness.gameId, {
      id: "A1",
      initialSeat: "A1NS" as PairSeat,
    });

    const db = (await harness.getDb()) as Db;
    const { assignments } = await import("@/db/games/tables/assignments");
    const rows = db.select().from(assignments).all();

    expect(rows).toEqual([{ id: "A1", initialSeat: "A1NS" }]);
  });

  it("round-trips a section movement (null before, value after)", async () => {
    const { createSection } = await import("@/db/games/actions/create-section");
    const { setSectionMovement } = await import(
      "@/db/games/actions/set-section-movement"
    );
    const { getSectionMovement } = await import(
      "@/db/games/queries/get-section-movement"
    );
    const db = (await harness.getDb()) as Db;

    await createSection(harness.gameId, { section: "A", tables: 8 });
    expect(await getSectionMovement(db, "A")).toBeNull();

    await setSectionMovement(harness.gameId, "A", {
      source: "MITCHELL",
      mitchell: { tables: 8, rounds: 8, boardsPerRound: 2 },
    });

    expect(await getSectionMovement(db, "A")).toEqual({
      source: "MITCHELL",
      mitchell: { tables: 8, rounds: 8, boardsPerRound: 2 },
    });
  });

  it("reports 0 for a section with no seated pairs", async () => {
    const { highestOccupiedTableInSection } = await import(
      "@/db/games/queries/highest-occupied-table"
    );
    const db = (await harness.getDb()) as Db;

    expect(await highestOccupiedTableInSection(db, "A")).toBe(0);
  });

  it("reports the highest occupied table within a section only", async () => {
    const { createPlayer } = await import("@/db/games/actions/create-player");
    const { createParticipant } = await import(
      "@/db/games/actions/create-participant"
    );
    const { highestOccupiedTableInSection } = await import(
      "@/db/games/queries/highest-occupied-table"
    );
    const db = (await harness.getDb()) as Db;

    let key = 0;
    async function seat(seat: string) {
      const p1 = await createPlayer(harness.gameId, {
        firstName: `F${key}`,
        lastName: "L",
      });
      const p2 = await createPlayer(harness.gameId, {
        firstName: `G${key}`,
        lastName: "L",
      });
      await createParticipant(harness.gameId, {
        type: "PAIR",
        initialSeat: seat as PairSeat,
        player1: p1.id,
        player2: p2.id,
        secretKey: `k${key++}`,
      } as never);
    }

    await seat("A3NS");
    await seat("A5NS");
    await seat("B7NS");

    expect(await highestOccupiedTableInSection(db, "A")).toBe(5);
    expect(await highestOccupiedTableInSection(db, "B")).toBe(7);
    expect(await highestOccupiedTableInSection(db, "C")).toBe(0);
  });
});
