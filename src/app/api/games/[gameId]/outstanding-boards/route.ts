import {
  getOutstandingBoards,
  OUTSTANDING_DETAIL_LIMIT,
} from "@/db/games/queries/get-outstanding-boards";
import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";

/**
 * GET /api/games/[gameId]/outstanding-boards — the playable boards that still
 * have no final result, resolved to the seated pair names and capped (the
 * export readiness screen only shows this list when a handful are outstanding;
 * the full count comes from the results-summary endpoint).
 */
export const GET = withGameRoute(async ({ db }) => {
  return success({
    boards: await getOutstandingBoards(db, OUTSTANDING_DETAIL_LIMIT),
  });
});
