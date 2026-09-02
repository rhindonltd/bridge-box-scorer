import {
  computeLeaderboard,
  computeSectionLeaderboards,
} from "@/services/leaderboard-service";
import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";

/**
 * Returns both the combined leaderboard (all sections pooled per board) and the
 * per-section leaderboards. The `leaderboard` field is retained for backward
 * compatibility; `sections` powers the per-section vs combined toggle.
 */
export const GET = withGameRoute(async ({ db, gameId }) => {
  const [leaderboard, sections] = await Promise.all([
    computeLeaderboard(db, gameId),
    computeSectionLeaderboards(db, gameId),
  ]);

  return success({ leaderboard, sections });
});
