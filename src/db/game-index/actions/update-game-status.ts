"use server";

import { getDb } from "@/db/game-index";
import { games } from "@/db/game-index/schema";
import { eq } from "drizzle-orm";

export async function updateGameStatus(gameId: number, status: string) {
  const db = await getDb();
  await db.update(games).set({ status }).where(eq(games.id, gameId));
}
