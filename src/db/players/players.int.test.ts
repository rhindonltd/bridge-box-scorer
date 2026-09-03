// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Player } from "@/db/players/schema";

function player(ebuNumber: number, first: string, last: string): Player {
  return { ebuNumber, firstName: first, lastName: last };
}

/**
 * Integration coverage for the EBU players database: syncPlayers (upsert +
 * prune) and findPlayer, against a real migrated players.db.
 */
describe("players db", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("players");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it("inserts players on first sync and finds one by EBU number", async () => {
    const { syncPlayers } = await import("@/db/players/actions/sync-ebu-players");
    const { findPlayer } = await import("@/db/players/queries/find-player");

    await syncPlayers([player(1, "Alice", "Adams"), player(2, "Bob", "Brown")]);

    const found = await findPlayer(1);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ firstName: "Alice", lastName: "Adams" });
  });

  it("returns an empty array for an unknown EBU number", async () => {
    const { findPlayer } = await import("@/db/players/queries/find-player");
    expect(await findPlayer(9999)).toEqual([]);
  });

  it("updates a changed name on re-sync without duplicating the row", async () => {
    const { syncPlayers } = await import("@/db/players/actions/sync-ebu-players");
    const { findPlayer } = await import("@/db/players/queries/find-player");

    await syncPlayers([player(1, "Alice", "Adams")]);
    await syncPlayers([player(1, "Alice", "Anderson")]);

    const found = await findPlayer(1);
    expect(found).toHaveLength(1);
    expect(found[0].lastName).toBe("Anderson");
  });

  it("prunes players absent from a subsequent sync", async () => {
    const { syncPlayers } = await import("@/db/players/actions/sync-ebu-players");
    const { findPlayer } = await import("@/db/players/queries/find-player");

    await syncPlayers([player(1, "Alice", "Adams"), player(2, "Bob", "Brown")]);
    // Second sync omits player 2 -> it should be deleted.
    await syncPlayers([player(1, "Alice", "Adams")]);

    expect(await findPlayer(1)).toHaveLength(1);
    expect(await findPlayer(2)).toHaveLength(0);
  });
});
