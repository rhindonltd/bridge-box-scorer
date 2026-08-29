import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "@/db/system/schema";

/**
 * Synchronous, schema-aware DB access for use in Socket.IO middleware.
 * Socket.IO middleware must call next() synchronously, so we use better-sqlite3
 * directly rather than the async getDb() helper.
 */
function getSystemDb() {
  const dataDir = process.env.DATABASE_URL ?? "/home/bridgebox/data";
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const dbFile = path.join(dataDir, "system.db");
  const sqlite = new Database(dbFile);
  return drizzle(sqlite, { schema });
}

export function findLoginSession(token: string) {
  const db = getSystemDb();
  const result = db
    .select()
    .from(schema.loginSessions)
    .where(eq(schema.loginSessions.token, token))
    .get();
  return result ?? null;
}
