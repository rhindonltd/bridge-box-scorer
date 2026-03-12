import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const dataDir = path.join(process.cwd(), "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbFile = path.join(dataDir, "bridge.db");
const sqlite = new Database(dbFile);

export const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./drizzle" })
