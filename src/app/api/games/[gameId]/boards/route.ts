import { boards } from "@/db/games/tables/boards";
import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";

export const GET = withGameRoute(async ({ db }) => {
  return success({
    boards: (
      await db
        .selectDistinct({ boardNumber: boards.boardNumber })
        .from(boards)
        .orderBy(boards.boardNumber)
    ).map((r) => r.boardNumber),
  });
});
