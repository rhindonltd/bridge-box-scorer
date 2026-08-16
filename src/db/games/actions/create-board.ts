"use server";

import { getDb } from "@/db/games";
import { boards, NewBoard } from "@/db/games/tables/boards";

export async function createBoard(gameId: string, board: NewBoard) {
  await (await getDb(gameId)).insert(boards).values(board);
}
