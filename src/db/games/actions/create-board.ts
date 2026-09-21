import "server-only";

import { requireGameDb } from "@/db/games";
import { boards, NewBoard } from "@/db/games/tables/boards";

export async function createBoard(gameId: string, board: NewBoard) {
  const db = await requireGameDb(gameId);

  await db.insert(boards).values(board);
}
