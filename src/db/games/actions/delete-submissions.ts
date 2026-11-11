import "server-only";

import { requireGameDb } from "@/db/games";
import { and, eq } from "drizzle-orm";
import { boardSubmissions } from "../tables/submissions";

/**
 * Deletes one side's pending submission for a table/round (the other side's is
 * left untouched). Used when a pair backs out of "waiting for confirmation" to
 * correct their entry.
 */
export async function deleteSideSubmission(
  gameId: string,
  section: string,
  table: number,
  round: number,
  side: "NS" | "EW",
) {
  const db = await requireGameDb(gameId);

  await db
    .delete(boardSubmissions)
    .where(
      and(
        eq(boardSubmissions.section, section),
        eq(boardSubmissions.tableNumber, table),
        eq(boardSubmissions.roundNumber, round),
        eq(boardSubmissions.side, side),
      ),
    );
}

/**
 * Deletes both sides' pending submissions for a table/round.
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
