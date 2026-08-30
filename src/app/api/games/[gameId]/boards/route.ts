import { NextResponse } from "next/server";
import { boards } from "@/db/games/tables/boards";
import { withGameRoute } from "@/lib/api/gameRoute";

export const GET = withGameRoute(async ({ db }) => {
  return NextResponse.json({
    success: true,
    result: {
      boards: (
        await db
          .selectDistinct({ boardNumber: boards.boardNumber })
          .from(boards)
          .orderBy(boards.boardNumber)
      ).map((r) => r.boardNumber),
    },
  });
});
