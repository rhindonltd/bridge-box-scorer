// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";

/**
 * Integration coverage for the per-database `migrate.ts` entry points. Each
 * exports an async `run*Migrations()` that resolves `getDb()` then applies the
 * drizzle migrations for that database. The harness has already migrated a
 * fresh file, so re-running is a no-op (drizzle migrations are idempotent) and
 * the exported function should simply resolve.
 */
describe("database migrate entry points", () => {
  let harness: DbHarness;

  afterEach(() => {
    harness.teardown();
  });

  it("runs the game-index migrations against a provisioned db", async () => {
    harness = createDbHarness("game-index");
    await harness.setup();

    const { runMigrations } = await import("@/db/game-index/migrate");
    await expect(runMigrations()).resolves.toBeUndefined();
  });

  it("runs the movements migrations against a provisioned db", async () => {
    harness = createDbHarness("movements");
    await harness.setup();

    const { runMovementsMigrations } = await import("@/db/movements/migrate");
    await expect(runMovementsMigrations()).resolves.toBeUndefined();
  });

  it("runs the players migrations against a provisioned db", async () => {
    harness = createDbHarness("players");
    await harness.setup();

    const { runPlayersMigrations } = await import("@/db/players/migrate");
    await expect(runPlayersMigrations()).resolves.toBeUndefined();
  });

  it("runs the system migrations against a provisioned db", async () => {
    harness = createDbHarness("system");
    await harness.setup();

    const { runSystemMigrations } = await import("@/db/system/migrate");
    await expect(runSystemMigrations()).resolves.toBeUndefined();
  });
});
