import "server-only";
import { getDb } from "@/db/game-index";
import { games } from "@/db/game-index/schema";
import { eq } from "drizzle-orm";

/** Mark a game finalised (read-only, available for export). */
export async function finaliseGame(gameId: string) {
  const db = getDb();
  await db
    .update(games)
    .set({
      finalisedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(games.gameId, gameId));
}

/** Undo finalising: the game becomes editable again. */
export async function reopenGame(gameId: string) {
  const db = getDb();
  await db
    .update(games)
    .set({ finalisedAt: null, updatedAt: new Date().toISOString() })
    .where(eq(games.gameId, gameId));
}
