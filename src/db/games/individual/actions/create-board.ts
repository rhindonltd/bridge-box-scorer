"use server";

import { getDb } from "@/db/games/individual";
import { Board, boards } from "@/db/games/individual/tables/boards";

export async function createBoard(gameId: string, board: Board) {
  await (await getDb(gameId)).insert(boards).values(board);
}
