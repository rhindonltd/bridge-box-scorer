import { findFinalisedGames } from "@/db/game-index/queries/find-finalised-games";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";

/** GET /api/games/finalised — finalised games, for the "Export Game" picker. */
export const GET = withBasicRoute(async () => {
  return success({ games: await findFinalisedGames() });
});
