"use server";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  if (typeof window !== "undefined") {
    throw new Error("SQLite can only be used on the server");
  }

  const dataDir = process.env.DATABASE_URL ?? "/home/bridgebox/data";
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

  const dbFile = path.join(dataDir, "movements.db");
  const sqlite = new Database(dbFile);
  dbInstance = drizzle(sqlite);

  return dbInstance;
}
