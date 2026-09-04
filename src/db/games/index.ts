import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

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

  const dbFile = path.join(dataDir, `${gameId}.db`);

  const dbInstance = drizzle(new Database(dbFile), { schema });
  dbInstances.set(gameId, dbInstance);

  return dbInstance;
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

  const dbInstance = drizzle(new Database(dbFile), { schema });
  dbInstances.set(gameId, dbInstance);

  return dbInstance;
}
