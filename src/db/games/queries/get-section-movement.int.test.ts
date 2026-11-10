// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { sections } from "@/db/games/tables/sections";
const spec = (specId: number) =>
  JSON.stringify({ source: "SPEC", specId, boardsPerRound: 2 });
describe("section movement queries", () => {
  let harness: DbHarness;
  let db: Db;
  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    db = (await harness.getDb()) as Db;
  });
  afterEach(() => {
    harness.teardown();
  });
  const add = (section: string, selectedMovement: string | null, ordinal = 0) =>
    db
      .insert(sections)
      .values({ section, label: section, tables: 4, selectedMovement, ordinal })
      .run();
  it("getSectionMovement parses a section's stored movement, or null", async () => {
    add("A", spec(7));
    add("B", null, 1);
    const { getSectionMovement } = await import(
      "@/db/games/queries/get-section-movement"
    );
    expect(await getSectionMovement(db, "A")).toMatchObject({ specId: 7 });
    expect(await getSectionMovement(db, "B")).toBeNull();
    expect(await getSectionMovement(db, "Z")).toBeNull();
  });
  it("getAnySectionMovement takes the first section by letter that has a valid movement", async () => {
    // Inserted out of order; A is invalid, so B (before C) wins.
    add("C", spec(3), 2);
    add("A", "not json", 0);
    add("B", spec(2), 1);
    const { getAnySectionMovement } = await import(
      "@/db/games/queries/get-section-movement"
    );
    expect(await getAnySectionMovement(db)).toMatchObject({ specId: 2 });
  });
  it("getAnySectionMovement is null when no section has a movement", async () => {
    add("A", null);
    const { getAnySectionMovement } = await import(
      "@/db/games/queries/get-section-movement"
    );
    expect(await getAnySectionMovement(db)).toBeNull();
  });
});
