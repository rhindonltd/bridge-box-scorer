import "server-only";

import { updateSetting } from "@/db/system/actions/update-setting";

/**
 * Setting keys for the club-wide default timer, stored in the generic `settings`
 * KV table. Only the two durations the director can edit are persisted; the
 * timing mode and warning threshold stay fixed at the shared defaults.
 */
export const TIMER_PLAY_SECONDS_PER_BOARD_KEY = "timer_play_seconds_per_board";
export const TIMER_MOVE_SECONDS_KEY = "timer_move_seconds";
export const TIMER_WARNING_SECONDS_KEY = "timer_warning_seconds";

/**
 * Persist the club-wide default timer settings: play time per board, the
 * changeover (move) time, and the last-minute warning threshold, all in whole
 * seconds. These become the starting point for every new game's timer — both
 * the setup form's defaults and the timer auto-created at game start when a
 * director never opens the Timer tab. Values are upserted so re-saving
 * overwrites in place.
 */
export async function saveDefaultTimerSettings(
  playSecondsPerBoard: number,
  moveSeconds: number,
  warningSeconds: number,
): Promise<void> {
  await updateSetting({
    settingKey: TIMER_PLAY_SECONDS_PER_BOARD_KEY,
    settingValue: String(playSecondsPerBoard),
  });
  await updateSetting({
    settingKey: TIMER_MOVE_SECONDS_KEY,
    settingValue: String(moveSeconds),
  });
  await updateSetting({
    settingKey: TIMER_WARNING_SECONDS_KEY,
    settingValue: String(warningSeconds),
  });
}
