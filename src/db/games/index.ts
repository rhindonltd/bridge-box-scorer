import "server-only";

import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema";
import { openDatabase } from "@/db/open-database";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

const dbInstances: Map<string, Db> = new Map();

export async function createDb(gameId: string): Promise<Db> {
  /* v8 ignore start -- server-only guard; window is always undefined under the node test env */
  if (typeof window !== "undefined") {
    throw new Error("SQLite can only be used on the server");
  }
  /* v8 ignore stop */

  const dataDir =
    process.env.DATABASE_GAMES_URL ?? "/home/bridgebox/data/games";

  // better-sqlite3 creates the .db file if missing, but only when the parent
  // directory already exists. The per-game "games" dir is a nested path
  // (e.g. /home/bridgebox/data/games) that may not be provisioned on a fresh
  // appliance, so create it — matching every other DB module.
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const dbFile = path.join(dataDir, `${gameId}.db`);

  const dbInstance = drizzle(openDatabase(dbFile), { schema });
  dbInstances.set(gameId, dbInstance);

  return dbInstance;
}

/**
 * Resolve a game's database, throwing the standard error when it doesn't exist.
 * Every action/query that needs a game db uses this so the null-guard lives in
 * one place instead of being repeated at each call site.
 */
export async function requireGameDb(gameId: string): Promise<Db> {
  const db = await getDb(gameId);
  if (!db) {
    throw new Error("Game db does not exist");
  }
  return db;
}

export async function getDb(gameId: string): Promise<Db | null> {
  if (dbInstances.has(gameId)) {
    return dbInstances.get(gameId)!;
  }

  /* v8 ignore start -- server-only guard; window is always undefined under the node test env */
  if (typeof window !== "undefined") {
    throw new Error("SQLite can only be used on the server");
  }
  /* v8 ignore stop */

  const dataDir =
    process.env.DATABASE_GAMES_URL ?? "/home/bridgebox/data/games";

  const dbFile = path.join(dataDir, `${gameId}.db`);

  if (!fs.existsSync(dbFile)) {
    return null;
  }

  const dbInstance = drizzle(openDatabase(dbFile), { schema });
  dbInstances.set(gameId, dbInstance);

  return dbInstance;
}
