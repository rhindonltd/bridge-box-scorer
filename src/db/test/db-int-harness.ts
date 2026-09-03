/**
 * Shared DB integration-test harness.
 *
 * Extracts the temp-dir + migrate + dynamic-import pattern (see
 * `src/db/games/actions/sections.int.test.ts`) into a reusable helper so every
 * database can be spun up against a fresh, migrated SQLite file in isolation.
 *
 * Usage (inside a `// @vitest-environment node` test file):
 *
 * ```ts
 * const h = createDbHarness("movements");
 * beforeEach(() => h.setup());
 * afterEach(() => h.teardown());
 *
 * it("round-trips", async () => {
 *   const db = await h.getDb();
 *   // ...exercise queries/actions imported AFTER h.setup() ran...
 * });
 * ```
 *
 * The four singleton databases (`game-index`, `movements`, `players`,
 * `system`) all read `DATABASE_URL` and cache a module-level `dbInstance`, so
 * the harness resets Vitest's module registry on both setup and teardown to
 * force `getDb()` to re-read the env var and re-open the fresh file. The
 * per-game `games` database reads `DATABASE_GAMES_URL` and caches per gameId.
 */
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { vi } from "vitest";

export type DbName = "game-index" | "games" | "movements" | "players" | "system";

interface DbDescriptor {
  /** Env var that points the db module at its data directory. */
  envVar: "DATABASE_URL" | "DATABASE_GAMES_URL";
  /** Migrations folder passed to drizzle's `migrate`. */
  migrationsFolder: string;
  /**
   * File name written inside the data dir. `games` is per-gameId so it has no
   * fixed file name here (the harness derives it from the gameId).
   */
  fileName?: string;
  /**
   * Dynamic import of the db index module (exposing `getDb`). Kept explicit
   * (rather than a `@/db/${name}` template) so Vite can statically analyse it.
   */
  importIndex: () => Promise<{ getDb: (...args: unknown[]) => unknown }>;
}

const DESCRIPTORS: Record<DbName, DbDescriptor> = {
  "game-index": {
    envVar: "DATABASE_URL",
    migrationsFolder: "./drizzle/game-index",
    fileName: "game-index.db",
    importIndex: () => import("@/db/game-index"),
  },
  games: {
    envVar: "DATABASE_GAMES_URL",
    migrationsFolder: "./drizzle/games",
    importIndex: () => import("@/db/games"),
  },
  movements: {
    envVar: "DATABASE_URL",
    migrationsFolder: "./drizzle/movements",
    fileName: "movements.db",
    importIndex: () => import("@/db/movements"),
  },
  players: {
    envVar: "DATABASE_URL",
    migrationsFolder: "./drizzle/players",
    fileName: "players.db",
    importIndex: () => import("@/db/players"),
  },
  system: {
    envVar: "DATABASE_URL",
    migrationsFolder: "./drizzle/system",
    fileName: "system.db",
    importIndex: () => import("@/db/system"),
  },
};

/**
 * Build a migrated SQLite database file on disk at `dbFile`, applying the
 * migrations from `migrationsFolder`.
 */
export async function buildMigratedDb(dbFile: string, migrationsFolder: string) {
  const Database = (await import("better-sqlite3")).default;
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");

  const db = drizzle(new Database(dbFile));
  migrate(db, { migrationsFolder });
  return db;
}

export interface DbHarness {
  /** The temp directory backing this harness (valid between setup/teardown). */
  readonly dir: string;
  /** For the per-game `games` db, the gameId used to name the file. */
  readonly gameId: string;
  /** Create the temp dir, point the env var at it, and reset module cache. */
  setup(): Promise<void>;
  /** Remove the temp dir and reset module cache. */
  teardown(): void;
  /** Resolve the live `getDb()` for this database (games requires gameId). */
  getDb(): Promise<unknown>;
  /** Absolute path to the migrated db file. */
  dbFilePath(): string;
}

/**
 * Create an isolated harness for one database. Call `setup()` in `beforeEach`
 * and `teardown()` in `afterEach`.
 */
export function createDbHarness(name: DbName): DbHarness {
  const descriptor = DESCRIPTORS[name];
  let dir = "";
  const gameId = `game-${Math.random().toString(16).slice(2)}`;

  function dbFilePath(): string {
    if (name === "games") return path.join(dir, `${gameId}.db`);
    return path.join(dir, descriptor.fileName!);
  }

  return {
    get dir() {
      return dir;
    },
    gameId,

    async setup() {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), `bbs-${name}-`));
      process.env[descriptor.envVar] = dir;
      // Singleton db modules cache their instance; drop the registry so the
      // next dynamic import re-reads the env var and opens the fresh file.
      vi.resetModules();
      await buildMigratedDb(dbFilePath(), descriptor.migrationsFolder);
    },

    teardown() {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
      vi.resetModules();
    },

    async getDb() {
      const mod = await descriptor.importIndex();
      if (name === "games") {
        const db = await mod.getDb(gameId);
        if (!db) throw new Error(`games db not created for ${gameId}`);
        return db;
      }
      return mod.getDb();
    },

    dbFilePath,
  };
}

export const ALL_DB_NAMES: DbName[] = [
  "game-index",
  "games",
  "movements",
  "players",
  "system",
];
