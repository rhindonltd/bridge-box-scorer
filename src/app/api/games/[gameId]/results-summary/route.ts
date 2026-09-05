import { getResultsSummary } from "@/db/games/queries/get-results-summary";
import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";

export const GET = withGameRoute(async ({ db }) => {
  return success(await getResultsSummary(db));
});
