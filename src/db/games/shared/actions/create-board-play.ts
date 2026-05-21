"use server";

import { getDb } from "@/db/games";
import { BoardPlay, boardPlays } from "@/db/games/shared/tables/board-plays";

export async function createBoardPlay(
  gameId: string,
  boardPlay: BoardPlay,
): Promise<BoardPlay> {
  const db = await getDb(gameId);
  const result = await db.insert(boardPlays).values(boardPlay).returning();
  return result[0];
}
