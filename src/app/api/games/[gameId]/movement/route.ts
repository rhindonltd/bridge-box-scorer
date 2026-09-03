import { getMovementWithProgress } from "@/services/movement-service";
import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";

export const GET = withGameRoute(async ({ db, req }) => {
  const section = new URL(req.url).searchParams.get("section") ?? undefined;
  return success({ movement: await getMovementWithProgress(db, section) });
});
