import { eq, and } from "drizzle-orm";
import { boards } from "@/db/games/tables/boards";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { BoardOutcome } from "@/model/score";
import { success } from "@/lib/api/success";

export const POST = withDirectorRoute(async ({ db, body, boardNumber }) => {
  const { roundNumber, tableNumber, result } = body as {
    roundNumber: number;
    tableNumber: number;
    result: BoardOutcome;
  };

  await db
    .update(boards)
    .set({
      directorOverrideResult: result,
      status: "OVERRIDDEN",
    })
    .where(
      and(
        eq(boards.roundNumber, roundNumber),
        eq(boards.tableNumber, tableNumber),
        eq(boards.boardNumber, boardNumber!),
      ),
    );

  return success({});
});
