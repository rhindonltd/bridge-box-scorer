// app/lib/db.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";

// Ensure this code only runs on the server
if (typeof window !== "undefined") {
  throw new Error("SQLite can only be used on the server");
}

const dataDir = process.env.DATABASE_URL!;
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const dbFile = path.join(dataDir, "bridge.db");
const sqlite = new Database(dbFile);

export const db = drizzle(sqlite);
