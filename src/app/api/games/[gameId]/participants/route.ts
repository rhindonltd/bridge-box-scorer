import { findPairs } from "@/db/games/queries/find-pairs";
import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";

export const GET = withGameRoute(async ({ db }) => {
  return success({ pairs: await findPairs(db) });
});
