import { checkStart } from "@/services/start-game-service";
import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";

export const GET = withGameRoute(async ({ gameId, db }) => {
  return success(await checkStart(gameId, db));
});
