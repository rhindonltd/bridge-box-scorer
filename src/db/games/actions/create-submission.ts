"use server";

import { getDb } from "@/db/games";
import { boardSubmissions } from "@/db/games/tables/submissions";
import { NewBoardSubmission } from "../tables/submissions";

export async function createBoardSubmission(
  gameId: string,
  boardSubmission: NewBoardSubmission,
) {
  await (
    await getDb(gameId)
  )
    .insert(boardSubmissions)
    .values(boardSubmission)
    .onConflictDoUpdate({
      target: [
        boardSubmissions.roundNumber,
        boardSubmissions.tableNumber,
        boardSubmissions.side,
      ],
      set: {
        boardNumber: boardSubmission.boardNumber,
        result: boardSubmission.result,
      },
    });
}
