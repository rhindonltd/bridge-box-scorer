import "server-only";

import { Server } from "socket.io";
import {
  findAllTimerStates,
  findTimerState,
} from "@/db/games/queries/find-timer-state";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { createEngine } from "@/timer/game-store";
import { scheduleGame } from "@/timer/scheduler";
import { SectionLetter } from "@/model/participants";
import { TimerState } from "@/timer/timer-state";
import { makeTimerBroadcaster } from "@/socket/handlers/timer/broadcast-timer";

/**
 * Promote a single section's saved timer configuration into a live, running
 * timer. Best-effort: failures are logged and swallowed so one section's timer
 * problem can never block a game — or another section's timer — from starting.
 */
async function promoteSection(
  gameId: string,
  section: SectionLetter,
  saved: TimerState,
  broadcast: ReturnType<typeof makeTimerBroadcaster>,
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
      { breaks: saved.breaks, warningSeconds: saved.warningSeconds },
    );

    // Begin running immediately: the game has started, so the clock starts too.
    engine.start();

    await updateTimerState(gameId, section, engine.getState());
    broadcast(gameId, section, engine.getState());
    scheduleGame(gameId, section, engine, { updateTimerState, broadcast });
  } catch (err) {
    console.error(
      `Failed to promote timer for game ${gameId} section ${section}:`,
      err,
    );
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
 * the others or the game start itself.
 */
export async function promoteTimerAtGameStart(
  gameId: string,
  io: Server,
): Promise<void> {
  try {
    const saved = await findAllTimerStates(gameId);
    if (saved.size === 0) return;

    const broadcast = makeTimerBroadcaster(io);

    for (const [section, state] of saved) {
      await promoteSection(gameId, section, state, broadcast);
    }
  } catch (err) {
    console.error(
      `Failed to promote timers at game start for game ${gameId}:`,
      err,
    );
  }
}

// Re-exported so existing single-section callers/tests that only need one
// section can still read a section's state directly.
export { findTimerState };
