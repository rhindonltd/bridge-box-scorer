import "server-only";

import { getDb } from "@/db/games";
import { and, eq } from "drizzle-orm";
import { boardSubmissions } from "../tables/submissions";

/**
 * Deletes a pair participant and their associated player records.
 */
export async function deleteBoardSubmissions(
  gameId: string,
  table: number,
  round: number,
) {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  await db
    .delete(boardSubmissions)
    .where(
      and(
        eq(boardSubmissions.tableNumber, table),
        eq(boardSubmissions.roundNumber, round),
      ),
    );
}
