// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { sql } from "drizzle-orm";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";

/**
 * Migration coverage for the `teams` table: a freshly migrated per-game
 * database has the table (alongside the existing ones) and round-trips a row
 * keyed by the home-table team id. Guards against the migration failing to
 * apply or the schema/migration drifting.
 */
describe("games db: teams table migration", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it("creates the teams table alongside participant and players", async () => {
    const db = (await harness.getDb()) as Db;

    const rows = db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table'`,
    );
    const names = rows.map((r) => r.name);

    expect(names).toContain("teams");
    expect(names).toContain("participant");
    expect(names).toContain("players");
  });

  it("round-trips a team row keyed by the home-table id", async () => {
    const { teams } = await import("@/db/games/tables/teams");
    const db = (await harness.getDb()) as Db;

    db.insert(teams).values({ teamId: "A1", teamName: "Sharks" }).run();
    db.insert(teams).values({ teamId: "A2", teamName: null }).run();

    const stored = db.select().from(teams).all();
    expect(stored).toEqual(
      expect.arrayContaining([
        { teamId: "A1", teamName: "Sharks" },
        { teamId: "A2", teamName: null },
      ]),
    );
  });
});
