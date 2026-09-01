import "server-only";

import { getDb } from "@/db/games";
import { boards, NewBoard } from "@/db/games/tables/boards";

export async function createBoard(gameId: string, board: NewBoard) {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  await db.insert(boards).values(board);
}
