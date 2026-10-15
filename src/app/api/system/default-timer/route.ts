import { NextResponse } from "next/server";
import { z } from "zod";

import { withBasicRoute } from "@/lib/api/basicRoute";
import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";
import { getDefaultTimerSettings } from "@/db/system/queries/default-timer-settings";
import { saveDefaultTimerSettings } from "@/db/system/actions/save-default-timer-settings";

/**
 * GET /api/system/default-timer — the club-wide default timer settings.
 *
 * Public (no admin token): the timer setup form and the game-start default
 * builder both need to read these to seed a new game's timer. Returns the two
 * editable durations plus the fixed timing mode / warning, each resolved
 * against the built-in fallback when unset.
 */
export const GET = withBasicRoute(async () => {
  return success({ settings: await getDefaultTimerSettings() });
});

// Durations are whole positive seconds, mirroring the per-section timer config
// route's constraints so global and per-game validation stay consistent.
const bodySchema = z.object({
  playSecondsPerBoard: z.number().int().positive(),
  moveSeconds: z.number().int().positive(),
  // The warning threshold may be 0 ("no warning"), so it is non-negative rather
  // than strictly positive — matching the per-section timer config route.
  warningSeconds: z.number().int().nonnegative(),
});

/**
 * PUT /api/system/default-timer — update the club-wide default timer durations
 * (admin-only). Play time per board and the changeover time, in seconds. Bad
 * body → 400.
 */
export const PUT = withAdminRoute(async ({ req }) => {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid default timer settings" },
      { status: 400 },
    );
  }

  await saveDefaultTimerSettings(
    parsed.data.playSecondsPerBoard,
    parsed.data.moveSeconds,
    parsed.data.warningSeconds,
  );
  return success({});
});
