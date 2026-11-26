import "server-only";

import {
  findAllTimerStates,
  findTimerState,
} from "@/db/games/queries/find-timer-state";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { createEngine } from "@/services/timer/game-store";
import { scheduleGame } from "@/services/timer/scheduler";
import { SectionLetter } from "@/model/participants";
import { TimerState } from "@/modules/timer";
import { logger } from "@/lib/log";

/** Sends a section's timer state to its connected clients. */
export type TimerBroadcast = (
  gameId: string,
  section: SectionLetter,
  timerState: TimerState,
) => void;

/**
 * Promote a single section's saved timer configuration into a live, running
 * timer. Best-effort: failures are logged and swallowed so one section's timer
 * problem can never block a game — or another section's timer — from starting.
 */
async function promoteSection(
  gameId: string,
  section: SectionLetter,
  saved: TimerState,
  broadcast: TimerBroadcast,
): Promise<void> {
  // Already live (running or a real phase in progress): a timer that has been
  // started must not be reset. A configured-but-not-started timer has a null
  // phase; anything else means it is already a live timer.
  if (saved.phase !== null || saved.isRunning) return;

  try {
    const engine = await createEngine(
      gameId,
      section,
      saved.boardsPerRound,
      saved.totalRounds,
      saved.playDuration,
      saved.moveDuration,
      {
        breaks: saved.breaks,
        warningSeconds: saved.warningSeconds,
        requiresDrawBetweenRounds: saved.requiresDrawBetweenRounds,
      },
    );

    // Begin running immediately: the game has started, so the clock starts too.
    engine.start();

    await updateTimerState(gameId, section, engine.getState());
    broadcast(gameId, section, engine.getState());
    scheduleGame(gameId, section, engine, { updateTimerState, broadcast });
  } catch (err) {
    logger.error({ err, gameId, section }, "Failed to promote timer");
  }
}

/**
 * Promote every section's saved timer configuration into a live, running timer
 * when a game is started.
 *
 * Each section is handled independently: sections the director configured
 * during setup (a "configured but not started" state — `phase: null`,
 * `isRunning: false`) begin running; sections with no saved timer, or whose
 * timer is already live, are left untouched. One section failing never affects
 * the others or the game start itself. `broadcast` sends each promoted timer
 * to its clients; the caller supplies it (e.g. `makeTimerBroadcaster(io)`).
 */
export async function promoteTimerAtGameStart(
  gameId: string,
  broadcast: TimerBroadcast,
): Promise<void> {
  try {
    const saved = await findAllTimerStates(gameId);
    if (saved.size === 0) return;

    for (const [section, state] of saved) {
      await promoteSection(gameId, section, state, broadcast);
    }
  } catch (err) {
    logger.error({ err, gameId }, "Failed to promote timers at game start");
  }
}

// Re-exported so existing single-section callers/tests that only need one
// section can still read a section's state directly.
export { findTimerState };
