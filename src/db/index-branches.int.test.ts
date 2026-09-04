// @vitest-environment node
import { describe, it, expect, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

/**
 * Branch coverage for the singleton db index modules (`game-index`,
 * `movements`, `players`, `system`) and the per-game `games` index module.
 *
 * These modules cache a module-level `dbInstance` and read their data
 * directory from an env var, creating it when missing. The other int tests
 * always run against a harness-provisioned (already-existing) directory, so
 * the "directory missing -> mkdir" branch and the cached-instance branch stay
 * uncovered. This file exercises them directly by pointing the env var at a
 * not-yet-created directory and calling `getDb()` twice.
 */

const created: string[] = [];

function freshDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  created.push(dir);
  return dir;
}

afterEach(() => {
  vi.resetModules();
});

afterEach(() => {
  for (const dir of created.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});

describe.each([
  { name: "game-index", importIndex: () => import("@/db/game-index") },
  { name: "movements", importIndex: () => import("@/db/movements") },
  { name: "players", importIndex: () => import("@/db/players") },
  { name: "system", importIndex: () => import("@/db/system") },
])("$name index module", ({ name, importIndex }) => {
  it("creates the data dir when missing and caches the instance", async () => {
    // Point at a directory that does NOT exist yet so the mkdir branch runs.
    const parent = freshDir(`bbs-idx-${name}-`);
    const dataDir = path.join(parent, "nested-data");
    expect(fs.existsSync(dataDir)).toBe(false);

    process.env.DATABASE_URL = dataDir;
    vi.resetModules();

    const mod = await importIndex();
    const first = await mod.getDb();
    expect(first).toBeTruthy();
    // mkdir branch was taken: the directory now exists.
    expect(fs.existsSync(dataDir)).toBe(true);

    // Second call returns the cached instance (cache-hit branch).
    const second = await mod.getDb();
    expect(second).toBe(first);
  });
});

describe.each([
  { name: "game-index", importIndex: () => import("@/db/game-index") },
  { name: "movements", importIndex: () => import("@/db/movements") },
  { name: "players", importIndex: () => import("@/db/players") },
  { name: "system", importIndex: () => import("@/db/system") },
])("$name index module (default data dir fallback)", ({ importIndex }) => {
  it("falls back to the built-in data dir when DATABASE_URL is unset", async () => {
    // Exercise the `?? "<default>"` branch. The default path is a real
    // production location we must not touch, so stub the filesystem + sqlite
    // driver so nothing is created on disk.
    delete process.env.DATABASE_URL;
    vi.resetModules();

    vi.doMock("fs", () => ({
      default: { existsSync: () => true, mkdirSync: () => undefined },
      existsSync: () => true,
      mkdirSync: () => undefined,
    }));
    vi.doMock("better-sqlite3", () => ({
      default: class FakeDatabase {},
    }));

    const mod = await importIndex();
    const db = await mod.getDb();
    expect(db).toBeTruthy();

    vi.doUnmock("fs");
    vi.doUnmock("better-sqlite3");
  });
});

describe("games index module", () => {
  async function buildMigratedGameDb(dir: string, gameId: string) {
    const Database = (await import("better-sqlite3")).default;
    const { drizzle } = await import("drizzle-orm/better-sqlite3");
    const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
    const schema = await import("@/db/games/schema");
    const db = drizzle(new Database(path.join(dir, `${gameId}.db`)), { schema });
    migrate(db, { migrationsFolder: "./drizzle/games" });
  }

  it("createDb opens a per-game db and getDb caches / returns null when missing", async () => {
    const dir = freshDir("bbs-idx-games-");
    process.env.DATABASE_GAMES_URL = dir;
    vi.resetModules();

    const gameId = `game-${Math.random().toString(16).slice(2)}`;
    await buildMigratedGameDb(dir, gameId);

    const games = await import("@/db/games");

    // getDb for an existing (on-disk) db opens and caches it.
    const opened = await games.getDb(gameId);
    expect(opened).toBeTruthy();
    // Second getDb hits the in-memory cache (dbInstances.has branch).
    expect(await games.getDb(gameId)).toBe(opened);

    // getDb for a gameId with no db file on disk returns null.
    expect(await games.getDb("does-not-exist")).toBeNull();

    // createDb builds and caches a brand-new instance for a new gameId.
    const newGameId = `game-${Math.random().toString(16).slice(2)}`;
    const createdDb = await games.createDb(newGameId);
    expect(createdDb).toBeTruthy();
    // The created instance is now cached, so getDb returns the same object.
    expect(await games.getDb(newGameId)).toBe(createdDb);
  });

  it("getDb falls back to the built-in games dir when the env var is unset", async () => {
    // With no env var and no db file at the default location, getDb takes the
    // `?? "<default>"` branch and returns null (file does not exist).
    delete process.env.DATABASE_GAMES_URL;
    vi.resetModules();

    const games = await import("@/db/games");
    expect(await games.getDb("game-no-such-file")).toBeNull();
  });

  it("createDb falls back to the built-in games dir when the env var is unset", async () => {
    // Exercise createDb's `?? "<default>"` branch. The default is a real
    // production path, so stub the sqlite driver so nothing is opened on disk.
    delete process.env.DATABASE_GAMES_URL;
    vi.resetModules();

    vi.doMock("better-sqlite3", () => ({
      default: class FakeDatabase {},
    }));

    const games = await import("@/db/games");
    const db = await games.createDb("game-fallback");
    expect(db).toBeTruthy();

    vi.doUnmock("better-sqlite3");
  });
});
