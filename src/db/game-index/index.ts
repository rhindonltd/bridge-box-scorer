import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

let dbInstance: BetterSQLite3Database<typeof schema> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  if (typeof window !== "undefined") {
    throw new Error("SQLite can only run on the server");
  }

  const dataDir = process.env.DATABASE_URL ?? "./data";
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const dbFile = path.join(dataDir, "game-index.db");
  const sqlite = new Database(dbFile);

  dbInstance = drizzle(sqlite, { schema });

  return dbInstance;
}
