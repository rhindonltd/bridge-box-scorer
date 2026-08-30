import { NextResponse } from "next/server";
import { getSchedule } from "@/services/schedule-service";
import { withGameRoute } from "@/lib/api/gameRoute";

export const GET = withGameRoute(async ({ db, seat }) => {
  const result = await getSchedule(db, seat!);
  if (!result) {
    return NextResponse.json(
      { success: false, error: "Schedule not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
});
