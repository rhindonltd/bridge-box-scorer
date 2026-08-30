import { NextResponse } from "next/server";
import { getBoardInstances } from "@/services/board-service";
import { withGameRoute } from "@/lib/api/gameRoute";

export const GET = withGameRoute(async ({ db, boardNumber }) => {
  return NextResponse.json({
    success: true,
      result: {
          instances: await getBoardInstances(db, boardNumber!),
      }
  });
});
