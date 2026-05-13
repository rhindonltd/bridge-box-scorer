"use server";

import { getDb } from "@/db/games";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { EventType } from "@/components/create/SimpleCreateGameForm";

export async function createGameDb(gameId: string, eventType: EventType) {
  const db = await getDb(gameId);

  if (eventType === "Individual") {
    migrate(db, { migrationsFolder: "./drizzle/games/individual" });
  } else {
    migrate(db, { migrationsFolder: "./drizzle/games/pairs" });
  }

  return db;
}
