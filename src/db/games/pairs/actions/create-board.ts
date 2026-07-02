"use server";

import { getDb } from "@/db/games/pairs";
import { Board, boards } from "@/db/games/pairs/tables/boards";

export async function createBoard(gameId: string, item: Board) {
  await (await getDb(gameId)).insert(boards).values(item);
}
