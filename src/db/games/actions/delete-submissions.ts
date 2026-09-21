import "server-only";

import { requireGameDb } from "@/db/games";
import { and, eq } from "drizzle-orm";
import { boardSubmissions } from "../tables/submissions";

/**
 * Deletes a pair participant and their associated player records.
 */
export async function deleteBoardSubmissions(
  gameId: string,
  section: string,
  table: number,
  round: number,
) {
  const db = await requireGameDb(gameId);

  await db
    .delete(boardSubmissions)
    .where(
      and(
        eq(boardSubmissions.section, section),
        eq(boardSubmissions.tableNumber, table),
        eq(boardSubmissions.roundNumber, round),
      ),
    );
}
