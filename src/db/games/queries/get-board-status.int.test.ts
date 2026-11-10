// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { makeBoard, seedFixtureMatch } from "@/mocks/fixtures/db-rows";
describe("getBoardStatus", () => {
  let harness: DbHarness;
  let db: Db;
  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    db = (await harness.getDb()) as Db;
    seedFixtureMatch(db);
  });
  afterEach(() => {
    harness.teardown();
  });
  const where = { section: "A", roundNumber: 1, tableNumber: 1, boardNumber: 1 };
  it("returns the stored status of the board row", async () => {
    db.insert(boards).values(makeBoard({ status: "SIT_OUT" })).run();
    const { getBoardStatus } = await import("@/db/games/queries/get-board-status");
    expect(await getBoardStatus(db, where)).toBe("SIT_OUT");
  });
  it("returns null when the row has no status", async () => {
    db.insert(boards).values(makeBoard({ status: null })).run();
    const { getBoardStatus } = await import("@/db/games/queries/get-board-status");
    expect(await getBoardStatus(db, where)).toBeNull();
  });
  it("returns null when there is no such board row", async () => {
    const { getBoardStatus } = await import("@/db/games/queries/get-board-status");
    expect(await getBoardStatus(db, where)).toBeNull();
  });
});
