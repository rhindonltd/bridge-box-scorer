import { BoardSubmission, boardSubmissions } from "../tables/submissions";
import { requireGameDb } from "@/db/games";
import { and, eq } from "drizzle-orm";

export async function findBoardSubmissions(
  gameId: string,
  section: string,
  table: number,
  round: number,
): Promise<BoardSubmission[]> {
  const db = await requireGameDb(gameId);

  return db
    .select()
    .from(boardSubmissions)
    .where(
      and(
        eq(boardSubmissions.section, section),
        eq(boardSubmissions.tableNumber, table),
        eq(boardSubmissions.roundNumber, round),
      ),
    );
}
