import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";

export const GET = withGameRoute(async ({ gameId }) => {
  return success({ game: await findGameById(gameId) });
});
