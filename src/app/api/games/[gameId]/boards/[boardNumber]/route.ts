import { getBoardInstances } from "@/services/board-service";
import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";

export const GET = withGameRoute(async ({ db, boardNumber }) => {
  return success({ instances: await getBoardInstances(db, boardNumber!) });
});
