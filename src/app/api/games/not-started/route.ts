import { findNotStartedGames } from "@/db/game-index/queries/find-all-games";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";

/** GET /api/games/not-started: games still being set up, for "Create Game". */
export const GET = withBasicRoute(async () => {
  return success({ games: await findNotStartedGames() });
});
