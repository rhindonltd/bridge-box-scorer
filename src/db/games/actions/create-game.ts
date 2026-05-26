"use server";

import { getDb as individualDb } from "@/db/games/individual";
import { getDb as pairsDb } from "@/db/games/pairs";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { GameType } from "@/db/games/types/game-type";

export async function createGameDb(gameId: string, gameType: GameType) {
  if (gameType === "INDIVIDUAL") {
    migrate(await individualDb(gameId), {
      migrationsFolder: "./drizzle/games/individual",
    });
  } else {
    migrate(await pairsDb(gameId), {
      migrationsFolder: "./drizzle/games/pairs",
    });
  }
}
