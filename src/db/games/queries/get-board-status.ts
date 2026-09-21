import { and, eq } from "drizzle-orm";
import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";

/**
 * The stored status of one board row (e.g. `"SIT_OUT"`), or null when no board
 * row exists for that (section, round, table, board). Used to reject result
 * submissions against a sit-out board — nobody plays that board at that table
 * this round.
 */
export async function getBoardStatus(
  db: Db,
  where: {
    section: string;
    roundNumber: number;
    tableNumber: number;
    boardNumber: number;
  },
): Promise<string | null> {
  const row = await db
    .select({ status: boards.status })
    .from(boards)
    .where(
      and(
        eq(boards.section, where.section),
        eq(boards.roundNumber, where.roundNumber),
        eq(boards.tableNumber, where.tableNumber),
        eq(boards.boardNumber, where.boardNumber),
      ),
    )
    .get();

  return row?.status ?? null;
}
