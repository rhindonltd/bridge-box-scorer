import { readExpectedLateSeats } from "@/db/games/queries/expected-late-seats";
import { withGameRoute } from "@/lib/api/gameRoute";
import { success } from "@/lib/api/success";

export const GET = withGameRoute(async ({ db }) => {
  const seats = await readExpectedLateSeats(db);
  return success({ seats: [...seats] });
});
