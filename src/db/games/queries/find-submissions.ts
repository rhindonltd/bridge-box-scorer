import { BoardSubmission, boardSubmissions } from "../tables/submissions";
import { getDb } from "@/db/games";
import { and, eq } from "drizzle-orm";

export async function findBoardSubmissions(
  gameId: string,
  table: number,
  round: number,
): Promise<BoardSubmission[]> {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  return db
    .select()
    .from(boardSubmissions)
    .where(
      and(
        eq(boardSubmissions.tableNumber, table),
        eq(boardSubmissions.roundNumber, round),
      ),
    );
}
