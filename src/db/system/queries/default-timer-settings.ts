import "server-only";

import { findSetting } from "@/db/system/queries/settings";
import {
  TIMER_MOVE_SECONDS_KEY,
  TIMER_PLAY_SECONDS_PER_BOARD_KEY,
  TIMER_WARNING_SECONDS_KEY,
} from "@/db/system/actions/save-default-timer-settings";
import {
  DEFAULT_TIMER_SETTINGS,
  DefaultTimerSettings,
} from "@/timer/timer-state";

/**
 * Parse a stored setting value to a whole integer at least `min`, or null when
 * it is absent/blank/non-numeric/out of range so the caller can fall back to
 * the hard-coded default. Durations require `min` 1 (positive); the warning
 * threshold allows 0 (meaning "no warning").
 */
function parseIntAtLeast(value: string | null, min: number): number | null {
  // Reject null and blank/whitespace-only strings explicitly: `Number("")` and
  // `Number("  ")` are 0, which would otherwise be wrongly accepted for the
  // warning (min 0) as a real "no warning" value rather than falling back.
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= min ? n : null;
}

/**
 * The club-wide default timer settings: the values a director can edit in
 * Settings (play per board, changeover, and the last-minute warning), combined
 * with the fixed timing mode. Any value not stored (or stored invalid) falls
 * back to the built-in {@link DEFAULT_TIMER_SETTINGS}, so a fresh Bridge Box
 * with no saved settings behaves exactly as before.
 */
export async function getDefaultTimerSettings(): Promise<DefaultTimerSettings> {
  const [playRaw, moveRaw, warningRaw] = await Promise.all([
    findSetting(TIMER_PLAY_SECONDS_PER_BOARD_KEY),
    findSetting(TIMER_MOVE_SECONDS_KEY),
    findSetting(TIMER_WARNING_SECONDS_KEY),
  ]);

  return {
    playSecondsPerBoard:
      parseIntAtLeast(playRaw, 1) ??
      DEFAULT_TIMER_SETTINGS.playSecondsPerBoard,
    moveSeconds:
      parseIntAtLeast(moveRaw, 1) ?? DEFAULT_TIMER_SETTINGS.moveSeconds,
    timingMode: DEFAULT_TIMER_SETTINGS.timingMode,
    // The warning threshold may legitimately be 0 ("no warning"), so it allows
    // a minimum of 0 rather than requiring a positive value.
    warningSeconds:
      parseIntAtLeast(warningRaw, 0) ??
      DEFAULT_TIMER_SETTINGS.warningSeconds,
  };
}
