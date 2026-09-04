// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getTableConfig } from "drizzle-orm/sqlite-core";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";

/**
 * Fills the movements-catalogue coverage gaps left by movements.int.test.ts:
 *  - the TEAM movement spec / table-spec / round-spec create actions and the
 *    getTeamMovementSpecById + getTeamMovement read paths;
 *  - the `.references(() => ...)` foreign-key thunks on the *tablespec and
 *    *roundspec tables (exercised via getTableConfig, which forces drizzle to
 *    evaluate the lazy reference closures).
 */
describe("movements db: team specs and schema references", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("movements");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it("creates a team movement spec and reads it by id (null when missing)", async () => {
    const { createTeamMovementSpec } = await import(
      "@/db/movements/actions/create-movement-spec"
    );
    const { getTeamMovementSpecById } = await import(
      "@/db/movements/queries/get-movement-spec"
    );

    const id = await createTeamMovementSpec({
      name: "Team 4",
      type: "AMERICAN_WHIST",
      tables: 4,
      boards: 24,
      boardsPerRound: 6,
      rounds: 4,
    });
    expect(id).toBeGreaterThan(0);

    expect((await getTeamMovementSpecById(id))?.name).toBe("Team 4");
    expect(await getTeamMovementSpecById(9999)).toBeNull();
  });

  it("assembles the full team movement tree (tables with their rounds)", async () => {
    const { createTeamMovementSpec } = await import(
      "@/db/movements/actions/create-movement-spec"
    );
    const { createTeamMovementTableSpec } = await import(
      "@/db/movements/actions/create-movement-table-spec"
    );
    const { createTeamMovementRoundSpec } = await import(
      "@/db/movements/actions/create-movement-round-spec"
    );
    const { getTeamMovement } = await import(
      "@/db/movements/queries/get-movement"
    );

    const movementId = await createTeamMovementSpec({
      name: "Team 2",
      type: "AMERICAN_WHIST",
      tables: 2,
      boards: 8,
      boardsPerRound: 4,
      rounds: 2,
    });

    const tableId = await createTeamMovementTableSpec({
      movementId,
      tableNumber: 1,
    });

    await createTeamMovementRoundSpec({
      tableId,
      roundNumber: 1,
      ns: "1",
      ew: "2",
      boardSet: 1,
    });
    await createTeamMovementRoundSpec({
      tableId,
      roundNumber: 2,
      ns: "1",
      ew: "3",
      boardSet: 2,
    });

    const movement = await getTeamMovement(movementId);
    expect(movement).toHaveLength(1);
    expect(movement[0]).toMatchObject({ tableNumber: 1 });
    expect(movement[0].rounds).toHaveLength(2);
    expect(movement[0].rounds.map((r) => r.boardSet)).toEqual([1, 2]);
  });

  it("resolves the foreign-key thunks on every *spec table", async () => {
    const {
      pairmovementspec,
      pairmovementtablespec,
      pairmovementroundspec,
      teammovementspec,
      teammovementtablespec,
      teammovementroundspec,
    } = await import("@/db/movements/schema");

    const cases: [unknown, unknown][] = [
      [pairmovementtablespec, pairmovementspec],
      [pairmovementroundspec, pairmovementtablespec],
      [teammovementtablespec, teammovementspec],
      [teammovementroundspec, teammovementtablespec],
    ];

    for (const [table, referenced] of cases) {
      const config = getTableConfig(table as Parameters<typeof getTableConfig>[0]);
      expect(config.foreignKeys.length).toBeGreaterThan(0);
      // Evaluate each reference thunk and confirm it points at the expected
      // parent table.
      const targets = config.foreignKeys.map((fk) => fk.reference().foreignTable);
      expect(targets).toContain(referenced);
    }
  });
});
