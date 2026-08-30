import { NextResponse } from "next/server";
import { computeLeaderboard } from "@/services/leaderboard-service";
import { withGameRoute } from "@/lib/api/gameRoute";

export const GET = withGameRoute(async ({ db }) => {
  return NextResponse.json({
    success: true,
    data: {
        leaderboard: await computeLeaderboard(db)
    },
  });
});
