import "server-only";

import { getDb } from "@/db/game-index";
import { games } from "@/db/game-index/schema";
import { eq } from "drizzle-orm";

export async function updateTableCount(gameId: string, tables: number) {
  const db = getDb();
  await db.update(games).set({ tables }).where(eq(games.gameId, gameId));
}
