import "server-only";

import {
  SelectedMovement,
  boardsPerRoundOf,
  expectedRounds,
} from "@/model/selected-movement";
import { isSwissMovement } from "@/model/event-format";
import { rehydrateSelectedMovement } from "@/services/movement-rehydration";
import {
  DEFAULT_TIMER_SETTINGS,
  DefaultTimerSettings,
  TimerConfig,
} from "@/timer/timer-state";
import { getDefaultTimerSettings } from "@/db/system/queries/default-timer-settings";

/**
 * The round structure of a section's selected movement, as needed to size a
 * timer: how many rounds it plays and how many boards each round. This mirrors
 * the client's `useMovementRoundInfo` (which drives the timer page's read-only
 * boards/rounds fields) but resolves entirely on the server.
 */
export interface MovementRoundInfo {
  boardsPerRound: number;
  totalRounds: number;
}

/**
 * Derive a movement's round structure server-side.
 *
 * - MITCHELL / SWISS / SWISS_TEAMS / ROUND_ROBIN_TEAMS carry both figures
 *   inline on the selection, so no lookup is needed.
 * - SPEC carries only boards-per-round; its round count comes from the
 *   movement itself. Rehydrating the selection expands it to concrete tables,
 *   and every table plays the same number of rounds, so the first table's round
 *   count is the total (matching `useMovementRoundInfo`'s SPEC branch).
 *
 * Returns null when the structure can't be determined (e.g. a SPEC whose
 * rehydration yields no tables) so the caller can skip that section rather than
 * build a nonsensical timer.
 */
export async function deriveMovementRoundInfo(
  selected: SelectedMovement,
): Promise<MovementRoundInfo | null> {
  const boardsPerRound = boardsPerRoundOf(selected);
  if (boardsPerRound == null || boardsPerRound <= 0) return null;

  // Non-SPEC selections carry the round count inline.
  const inlineRounds = expectedRounds(selected);
  if (inlineRounds != null) {
    return { boardsPerRound, totalRounds: inlineRounds };
  }

  // SPEC: read the round count off the rehydrated movement's first table.
  const { movement } = await rehydrateSelectedMovement(selected);
  const totalRounds = movement[0]?.rounds.length ?? 0;
  if (totalRounds <= 0) return null;

  return { boardsPerRound, totalRounds };
}

/**
 * Build the default {@link TimerConfig} for a section, as if the director had
 * opened the timer page and saved without changing anything. The phase lengths,
 * timing mode and warning come from `settings` (the club-wide default timer
 * settings — the same values the setup form seeds from); the boards-per-round
 * and round count come from the section's selected movement.
 *
 * The default play figure is per board, so the effective per-round
 * `playDuration` is the per-board figure multiplied by the movement's
 * boards-per-round — exactly the derivation the setup form applies in Per Board
 * mode. Pure (takes the resolved settings as input) so it stays easy to test.
 */
export function buildDefaultTimerConfig(
  info: MovementRoundInfo,
  settings: DefaultTimerSettings = DEFAULT_TIMER_SETTINGS,
): TimerConfig {
  const { boardsPerRound, totalRounds } = info;

  return {
    boardsPerRound,
    totalRounds,
    playDuration: settings.playSecondsPerBoard * boardsPerRound,
    moveDuration: settings.moveSeconds,
    timingMode: settings.timingMode,
    warningSeconds: settings.warningSeconds,
    breaks: [],
  };
}

/**
 * Build the default timer config for a section's selected movement, or null
 * when the movement's structure can't be derived. A convenience wrapper over
 * {@link deriveMovementRoundInfo} + {@link buildDefaultTimerConfig} that reads
 * the club-wide default timer settings (play per board, changeover) that a
 * director can edit in Settings, falling back to the built-in defaults when
 * none are stored. It also stamps `requiresDrawBetweenRounds` for Swiss
 * sections (which wait for the director to draw each round rather than
 * auto-advancing through a move gap) — matching how the config save route
 * derives that flag.
 */
export async function buildDefaultTimerConfigFor(
  selected: SelectedMovement,
): Promise<TimerConfig | null> {
  const info = await deriveMovementRoundInfo(selected);
  if (!info) return null;

  const settings = await getDefaultTimerSettings();

  return {
    ...buildDefaultTimerConfig(info, settings),
    requiresDrawBetweenRounds: isSwissMovement(selected),
  };
}
