"use server";

import { getDb as individualDb } from "@/db/games/individual";
import { getDb as pairDb } from "@/db/games/pairs";
import { BoardPlay, boardPlays } from "@/db/games/shared/tables/board-plays";
import { GameType } from "@/db/games/types/game-type";

export async function createBoardPlay(
  gameType: GameType,
  gameId: string,
  boardPlay: BoardPlay,
): Promise<BoardPlay> {
  const db = await (gameType == "INDIVIDUAL"
    ? individualDb(gameId)
    : pairDb(gameId));
  const result = await db.insert(boardPlays).values(boardPlay).returning();
  return result[0];
}
