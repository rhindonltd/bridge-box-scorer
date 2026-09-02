// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

let tmpDir: string;
let gameId: string;

// Point the games DB directory at a fresh temp dir before importing the db
// modules, then build a migrated per-game DB per test WITHOUT the default
// "A" section seed (createGameDb seeds one), so these tests control the
// section set explicitly.
async function buildEmptyGameDb(dir: string, gameId: string) {
  const Database = (await import("better-sqlite3")).default;
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const schema = await import("@/db/games/schema");

  const dbFile = path.join(dir, `${gameId}.db`);
  const db = drizzle(new Database(dbFile), { schema });
  migrate(db, { migrationsFolder: "./drizzle/games" });
}

describe("section queries and actions", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sections-actions-"));
    process.env.DATABASE_GAMES_URL = tmpDir;
    gameId = `game-${Math.random().toString(16).slice(2)}`;
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  });

  async function setup() {
    await buildEmptyGameDb(tmpDir, gameId);
    const games = await import("@/db/games");
    const db = await games.getDb(gameId);
    if (!db) throw new Error("db not created");
    return { games, db };
  }

  it("creates sections, defaults label and ordinal, and lists them ordered", async () => {
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { findSections } = await import(
      "@/db/games/queries/find-sections"
    );
    const { db } = await setup();

    await createSection(gameId, { section: "A", tables: 8 });
    await createSection(gameId, { section: "B", tables: 6, label: "North" });

    const rows = await findSections(db);
    expect(rows.map((r) => r.section)).toEqual(["A", "B"]);
    expect(rows[0]).toMatchObject({ label: "A", tables: 8, ordinal: 0 });
    expect(rows[1]).toMatchObject({ label: "North", tables: 6, ordinal: 1 });
  });

  it("rejects duplicate section letters", async () => {
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    await setup();

    await createSection(gameId, { section: "A", tables: 8 });
    await expect(
      createSection(gameId, { section: "A", tables: 4 }),
    ).rejects.toThrow(/already exists/);
  });

  it("renames a section label without changing its letter", async () => {
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { renameSection } = await import(
      "@/db/games/actions/rename-section"
    );
    const { findSections } = await import(
      "@/db/games/queries/find-sections"
    );
    const { db } = await setup();

    await createSection(gameId, { section: "A", tables: 8 });
    await renameSection(gameId, "A", "Red Room");

    const [row] = await findSections(db);
    expect(row).toMatchObject({ section: "A", label: "Red Room" });
  });

  it("resizes a section and sets/reads its movement", async () => {
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { updateSectionTables } = await import(
      "@/db/games/actions/update-section-tables"
    );
    const { setSectionMovement } = await import(
      "@/db/games/actions/set-section-movement"
    );
    const { getSectionMovement } = await import(
      "@/db/games/queries/get-section-movement"
    );
    const { findSections } = await import(
      "@/db/games/queries/find-sections"
    );
    const { db } = await setup();

    await createSection(gameId, { section: "B", tables: 6 });
    await updateSectionTables(gameId, "B", 9);

    const [row] = await findSections(db);
    expect(row.tables).toBe(9);

    expect(await getSectionMovement(db, "B")).toBeNull();

    await setSectionMovement(gameId, "B", {
      source: "MITCHELL",
      mitchell: { tables: 9, rounds: 9, boardsPerRound: 2 },
    });

    expect(await getSectionMovement(db, "B")).toEqual({
      source: "MITCHELL",
      mitchell: { tables: 9, rounds: 9, boardsPerRound: 2 },
    });
  });

  it("blocks shrinking a section below a seated table", async () => {
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { updateSectionTables } = await import(
      "@/db/games/actions/update-section-tables"
    );
    const { db } = await setup();
    const { players } = await import("@/db/games/tables/players");
    const { participants } = await import(
      "@/db/games/tables/participants"
    );

    await createSection(gameId, { section: "A", tables: 8 });

    // Seat a pair at A5NS.
    const p1 = db
      .insert(players)
      .values({ firstName: "A", lastName: "B" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "C", lastName: "D" })
      .returning()
      .get();
    db.insert(participants)
      .values({
        initialSeat: "A5NS",
        player1: p1.id,
        player2: p2.id,
        secretKey: "k",
      })
      .run();

    await expect(updateSectionTables(gameId, "A", 4)).rejects.toThrow(
      /table 5 has seated participants/,
    );

    // Shrinking to exactly 5 (keeping the occupied table) is allowed.
    await expect(updateSectionTables(gameId, "A", 5)).resolves.toBeUndefined();
  });

  it("blocks deleting a section with seated participants", async () => {
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { deleteSection } = await import(
      "@/db/games/actions/delete-section"
    );
    const { findSections } = await import(
      "@/db/games/queries/find-sections"
    );
    const { db } = await setup();
    const { players } = await import("@/db/games/tables/players");
    const { participants } = await import(
      "@/db/games/tables/participants"
    );

    await createSection(gameId, { section: "A", tables: 8 });
    await createSection(gameId, { section: "B", tables: 4 });

    const p1 = db
      .insert(players)
      .values({ firstName: "A", lastName: "B" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "C", lastName: "D" })
      .returning()
      .get();
    db.insert(participants)
      .values({
        initialSeat: "A1NS",
        player1: p1.id,
        player2: p2.id,
        secretKey: "k",
      })
      .run();

    await expect(deleteSection(gameId, "A")).rejects.toThrow(
      /seated participants/,
    );

    // B is empty, so it can be deleted.
    await deleteSection(gameId, "B");
    const rows = await findSections(db);
    expect(rows.map((r) => r.section)).toEqual(["A"]);
  });
});
