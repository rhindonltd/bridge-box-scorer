// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getTableConfig } from "drizzle-orm/sqlite-core";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";

/**
 * Fills the movements-catalogue coverage gap left by movements.int.test.ts:
 * the `.references(() => ...)` foreign-key thunks on the *tablespec and
 * *roundspec tables (exercised via getTableConfig, which forces drizzle to
 * evaluate the lazy reference closures).
 */
describe("movements db: schema references", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("movements");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it("resolves the foreign-key thunks on every *spec table", async () => {
    const {
      pairmovementspec,
      pairmovementtablespec,
      pairmovementroundspec,
    } = await import("./schema");

    const cases: [unknown, unknown][] = [
      [pairmovementtablespec, pairmovementspec],
      [pairmovementroundspec, pairmovementtablespec],
    ];

    for (const [table, referenced] of cases) {
      const config = getTableConfig(
        table as Parameters<typeof getTableConfig>[0],
      );
      expect(config.foreignKeys.length).toBeGreaterThan(0);
      // Evaluate each reference thunk and confirm it points at the expected
      // parent table.
      const targets = config.foreignKeys.map(
        (fk) => fk.reference().foreignTable,
      );
      expect(targets).toContain(referenced);
    }
  });
});
