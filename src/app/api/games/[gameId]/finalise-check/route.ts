import { checkFinalise } from "@/services/finalise-game-service";
import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";

/**
 * GET /api/games/[gameId]/finalise-check — whether the game can be finalised
 * and, if not, what is outstanding. Read-only and open, like start-check.
 */
export const GET = withGameRoute(async ({ gameId, db }) => {
  return success(await checkFinalise(gameId, db));
});
