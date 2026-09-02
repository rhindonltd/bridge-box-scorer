import "server-only";

import { getDb } from "@/db/games";
import { boardSubmissions } from "@/db/games/tables/submissions";
import { NewBoardSubmission } from "../tables/submissions";

export async function createBoardSubmission(
  gameId: string,
  boardSubmission: NewBoardSubmission,
) {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  await db
    .insert(boardSubmissions)
    .values(boardSubmission)
    .onConflictDoUpdate({
      target: [
        boardSubmissions.section,
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
