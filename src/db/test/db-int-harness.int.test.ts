// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import Database from "better-sqlite3";

import {
  ALL_DB_NAMES,
  createDbHarness,
  type DbHarness,
} from "@/db/test/db-int-harness";

/**
 * Smoke test proving the shared harness can spin up and tear down each of the
 * five migrated databases in isolation, and that migrations actually produced
 * tables.
 */
describe("db integration harness", () => {
  let harness: DbHarness | null = null;

  afterEach(() => {
    harness?.teardown();
    harness = null;
  });

  it.each(ALL_DB_NAMES)(
    "builds a migrated %s database with at least one table",
    async (name) => {
      harness = createDbHarness(name);
      await harness.setup();

      const file = harness.dbFilePath();

      // Open the freshly migrated file directly and inspect its schema.
      const raw = new Database(file);
      const tables = raw
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'",
        )
        .all() as { name: string }[];
      raw.close();

      expect(tables.length).toBeGreaterThan(0);
    },
  );

  it("resolves a live getDb() for the games database", async () => {
    harness = createDbHarness("games");
    await harness.setup();

    const db = await harness.getDb();
    expect(db).toBeTruthy();
  });

  it("isolates temp dirs between harness instances", async () => {
    const a = createDbHarness("system");
    const b = createDbHarness("system");
    await a.setup();
    const dirA = a.dir;
    a.teardown();

    await b.setup();
    const dirB = b.dir;
    b.teardown();

    expect(dirA).not.toEqual(dirB);
  });
});
