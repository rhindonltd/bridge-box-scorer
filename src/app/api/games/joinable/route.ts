import { findJoinableGames } from "@/db/game-index/queries";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success"

export const GET = withBasicRoute(async () => {
  return success({ games: await findJoinableGames() });
});
