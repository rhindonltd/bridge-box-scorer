"use server";

import { getDb } from "@/db/games/individual";
import { NewBoard, boards } from "@/db/games/individual/tables/boards";

export async function createBoard(gameId: string, board: NewBoard) {
  await (await getDb(gameId)).insert(boards).values(board);
}
