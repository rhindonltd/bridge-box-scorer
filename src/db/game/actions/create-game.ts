"use server";

import { getDb as pairsDb } from "@/db/game";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { GameType } from "@/db/game/types/game-type";

export async function createGameDb(gameId: string, gameType: GameType) {
  migrate(await pairsDb(gameId), {
    migrationsFolder: "./drizzle/games/pairs",
  });
}
