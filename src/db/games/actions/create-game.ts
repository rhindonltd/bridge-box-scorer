"use server";

import { createDb, getDb } from "@/db/games";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

export async function createGameDb(gameId: string) {
  if (await getDb(gameId)) {
    throw new Error("Database already exists");
  }

  migrate(await createDb(gameId), {
    migrationsFolder: "./drizzle/games",
  });
}
