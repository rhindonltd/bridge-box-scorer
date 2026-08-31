import { getMovementWithProgress } from "@/services/movement-service";
import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";

export const GET = withGameRoute(async ({ db }) => {
  return success({ movement: await getMovementWithProgress(db) });
});
