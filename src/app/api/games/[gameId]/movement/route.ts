import { NextResponse } from "next/server";
import { getMovementWithProgress } from "@/services/movement-service";
import { withGameRoute } from "@/lib/api/gameRoute";

export const GET = withGameRoute(async ({ db }) => {
  return NextResponse.json({
    success: true,
    result: {
        movement: (await getMovementWithProgress(db))
    },
  });
});
