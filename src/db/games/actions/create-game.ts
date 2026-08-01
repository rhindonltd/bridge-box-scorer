"use server";

import { getDb as pairsDb } from "@/db/games/pairs";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { GameType } from "@/db/games/types/game-type";

export async function createGameDb(gameId: string, gameType: GameType) {
  migrate(await pairsDb(gameId), {
    migrationsFolder: "./drizzle/games/pairs",
  });
}
