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

  // Drive `getDb()` (which invokes each descriptor's `importIndex` thunk) and
  // `dbFilePath()` for every database, covering both the singleton branch and
  // the games branch of the harness.
  it.each(ALL_DB_NAMES)(
    "resolves a live getDb() and dbFilePath() for the %s database",
    async (name) => {
      harness = createDbHarness(name);
      await harness.setup();

      const db = await harness.getDb();
      expect(db).toBeTruthy();

      // dbFilePath points inside the temp dir; games uses <gameId>.db while the
      // singletons use their fixed file name.
      expect(harness.dbFilePath().startsWith(harness.dir)).toBe(true);
      expect(harness.dbFilePath().endsWith(".db")).toBe(true);
    },
  );

  it("getDb throws when a games db was never built on disk", async () => {
    // A fresh games harness whose file we delete before requesting getDb: the
    // index module's getDb returns null, so the harness raises its own guard.
    harness = createDbHarness("games");
    await harness.setup();

    const fs = await import("node:fs");
    fs.rmSync(harness.dbFilePath(), { force: true });

    await expect(harness.getDb()).rejects.toThrow(/games db not created/);
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
