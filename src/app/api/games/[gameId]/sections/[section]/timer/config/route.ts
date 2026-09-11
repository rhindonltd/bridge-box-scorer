import { NextResponse } from "next/server";
import { z } from "zod";

import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { sectionFromUrl } from "@/lib/api/section-param";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { buildConfiguredTimerState } from "@/timer/timer-state";
import { broadcastTimerConfigSaved } from "@/socket/broadcast/timer-broadcast";
import { breakConfigSchema, toBreakConfigs } from "@/socket/handlers/timer/payload";

const bodySchema = z.object({
  boardsPerRound: z.number().int().positive(),
  totalRounds: z.number().int().positive(),
  playDuration: z.number().int().positive(),
  moveDuration: z.number().int().positive(),
  breaks: z.array(breakConfigSchema).optional(),
  warningSeconds: z.number().int().nonnegative().optional(),
});

/**
 * PUT /api/games/[gameId]/sections/[section]/timer/config — save a section's
 * timer configuration during game setup without starting it (director-only).
 *
 * Persists a "configured but not started" timer state (phase null, not running)
 * to the section's timer metadata and broadcasts `timer:sync` so the setup UI
 * reflects the saved config. Unlike creating a live timer, this never starts an
 * engine or schedules phase transitions — the config is promoted to a live
 * timer only when the game starts. Re-saving overwrites the previous config.
 *
 * Bad body → 400; infra failures → 500.
 */
export const PUT = withDirectorRoute(async ({ gameId, req }) => {
  const section = sectionFromUrl(req.url);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));

  if (!section || !parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid timer configuration" },
      { status: 400 },
    );
  }

  const {
    boardsPerRound,
    totalRounds,
    playDuration,
    moveDuration,
    breaks,
    warningSeconds,
  } = parsed.data;

  try {
    const timerState = buildConfiguredTimerState({
      boardsPerRound,
      totalRounds,
      playDuration,
      moveDuration,
      breaks: toBreakConfigs(breaks),
      warningSeconds,
    });

    await updateTimerState(gameId, section, timerState);
    broadcastTimerConfigSaved(gameId, section, timerState);

    return success({});
  } catch (err) {
    return respondToActionError(
      err,
      `Failed to save timer config for game ${gameId} section ${section}:`,
    );
  }
});
