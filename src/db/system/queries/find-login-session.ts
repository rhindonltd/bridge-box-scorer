import path from "path";
import fs from "fs";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "@/db/system/schema";
import { openDatabase } from "@/db/open-database";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Synchronous, schema-aware DB access for use in Socket.IO middleware.
 * Socket.IO middleware must call next() synchronously, so we use better-sqlite3
 * directly rather than the async getDb() helper.
 *
 * The connection is opened once and cached: this is a hot path (invoked on every
 * director-gated socket action) so re-opening per call would leak connections
 * and defeat the shared shutdown registry.
 */
function getSystemDb() {
  if (dbInstance) return dbInstance;

  const dataDir = process.env.DATABASE_URL ?? "/home/bridgebox/data";
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const dbFile = path.join(dataDir, "system.db");
  const sqlite = openDatabase(dbFile);
  dbInstance = drizzle(sqlite, { schema });
  return dbInstance;
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
