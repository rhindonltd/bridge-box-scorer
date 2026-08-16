"use server";

import { getDb } from "@/db/games";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { GameType } from "@/db/games/types/game-type";

export async function createGameDb(gameId: string, gameType: GameType) {
  migrate(await getDb(gameId), {
    migrationsFolder: "./drizzle/games/pairs",
  });
}
