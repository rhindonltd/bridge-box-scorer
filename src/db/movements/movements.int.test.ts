// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";

/**
 * Integration coverage for the movements catalogue database: creating pair
 * movement specs / table specs / round specs and reading them back via
 * getPairMovementSpecsForTables, getPairMovementSpecById, and the assembled
 * getPairMovement tree — against a real migrated movements.db.
 */
describe("movements db", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("movements");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it("creates a pair movement spec and finds it by table count", async () => {
    const { createPairMovementSpec } = await import(
      "@/db/movements/actions/create-movement-spec"
    );
    const { getPairMovementSpecsForTables } = await import(
      "@/db/movements/queries/get-movements"
    );

    const id = await createPairMovementSpec({
      name: "Mitchell 8",
      type: "MITCHELL",
      tables: 8,
      boards: 16,
      boardsPerRound: 2,
      rounds: 8,
    });
    expect(id).toBeGreaterThan(0);

    const forEight = await getPairMovementSpecsForTables(8);
    expect(forEight).toHaveLength(1);
    expect(forEight[0]).toMatchObject({ name: "Mitchell 8", tables: 8 });

    expect(await getPairMovementSpecsForTables(6)).toEqual([]);
  });

  it("fetches a single pair spec by id (null when missing)", async () => {
    const { createPairMovementSpec } = await import(
      "@/db/movements/actions/create-movement-spec"
    );
    const { getPairMovementSpecById } = await import(
      "@/db/movements/queries/get-movement-spec"
    );

    const id = await createPairMovementSpec({
      name: "Howell 6",
      type: "HOWELL",
      tables: 6,
      boards: 24,
      boardsPerRound: 4,
      rounds: 6,
    });

    expect((await getPairMovementSpecById(id))?.name).toBe("Howell 6");
    expect(await getPairMovementSpecById(9999)).toBeNull();
  });

  it("assembles the full pair movement tree (tables with their rounds)", async () => {
    const { createPairMovementSpec } = await import(
      "@/db/movements/actions/create-movement-spec"
    );
    const { createPairMovementTableSpec } = await import(
      "@/db/movements/actions/create-movement-table-spec"
    );
    const { createPairMovementRoundSpec } = await import(
      "@/db/movements/actions/create-movement-round-spec"
    );
    const { getPairMovement } = await import(
      "@/db/movements/queries/get-movement"
    );

    const movementId = await createPairMovementSpec({
      name: "Mitchell 2",
      type: "MITCHELL",
      tables: 2,
      boards: 4,
      boardsPerRound: 2,
      rounds: 2,
    });

    const tableId = await createPairMovementTableSpec({
      movementId,
      tableNumber: 1,
    });

    await createPairMovementRoundSpec({
      tableId,
      roundNumber: 1,
      ns: "1",
      ew: "2",
      boardSet: 1,
    });
    await createPairMovementRoundSpec({
      tableId,
      roundNumber: 2,
      ns: "1",
      ew: "3",
      boardSet: 2,
    });

    const movement = await getPairMovement(movementId);
    expect(movement).toHaveLength(1);
    expect(movement[0]).toMatchObject({ tableNumber: 1 });
    expect(movement[0].rounds).toHaveLength(2);
    expect(movement[0].rounds.map((r) => r.boardSet)).toEqual([1, 2]);
  });
});
