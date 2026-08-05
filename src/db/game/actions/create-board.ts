"use server";

import { getDb } from "@/db/game";
import { boards, NewBoard } from "@/db/game/tables/boards";

export async function createBoard(gameId: string, board: NewBoard) {
  await (await getDb(gameId)).insert(boards).values(board);
}
