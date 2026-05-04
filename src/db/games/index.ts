"use server";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";

const dbInstances: Map<number, ReturnType<typeof drizzle>> = new Map();

export async function getDb(gameId: number) {
  if (dbInstances.has(gameId)) {
    return dbInstances.get(gameId)!;
  }

  if (typeof window !== "undefined") {
    throw new Error("SQLite can only be used on the server");
  }

  const dataDir = process.env.DATABASE_GAMES_URL ?? "/home/bridgebox/data/games";
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

  const dbFile = path.join(dataDir, `${gameId}.db`);
  const sqlite = new Database(dbFile);

  const dbInstance = drizzle(sqlite);
  dbInstances.set(gameId, dbInstance);

  return dbInstance;
}
