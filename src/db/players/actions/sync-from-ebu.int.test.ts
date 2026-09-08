// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";

/**
 * End-to-end integration for the EBU sync path — parseEbuCsv + syncPlayers
 * against a real migrated players.db in a temp DATABASE_URL. No network: the
 * CSV is a fixture string fed straight into parseEbuCsv.
 */

/** Build a CSV of `count` rows starting at ebu number `startAt`. */
function makeCsv(count: number, startAt = 1): string {
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const ebu = startAt + i;
    lines.push(`${ebu},First${ebu},Last${ebu}`);
  }
  return lines.join("\n");
}

describe("EBU sync (parse + write)", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("players");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it("parses a fixture CSV and upserts players, then prunes on re-sync", async () => {
    const { parseEbuCsv } = await import("@/db/players/actions/sync-from-ebu");
    const { syncPlayers } = await import(
      "@/db/players/actions/sync-ebu-players"
    );
    const { findPlayer } = await import("@/db/players/queries/find-player");

    // First sync: 1500 players.
    await syncPlayers(parseEbuCsv(makeCsv(1500)));
    expect(await findPlayer(1)).toHaveLength(1);
    expect(await findPlayer(1500)).toHaveLength(1);

    // Second sync: only the first 1200 -> 1201..1500 should be pruned.
    await syncPlayers(parseEbuCsv(makeCsv(1200)));
    expect(await findPlayer(1)).toHaveLength(1);
    expect(await findPlayer(1300)).toHaveLength(0);
  });

  it("aborts (throws) on a suspiciously small file before touching the db", async () => {
    const { parseEbuCsv } = await import("@/db/players/actions/sync-from-ebu");
    expect(() => parseEbuCsv(makeCsv(999))).toThrow("suspiciously small");
  });
});
