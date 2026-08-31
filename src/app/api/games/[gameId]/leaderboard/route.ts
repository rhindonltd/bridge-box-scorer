import { computeLeaderboard } from "@/services/leaderboard-service";
import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";

export const GET = withGameRoute(async ({ db, gameId }) => {
  return success({ leaderboard: await computeLeaderboard(db, gameId) });
});
