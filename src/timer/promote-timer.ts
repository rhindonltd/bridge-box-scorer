import "server-only";

import { Server } from "socket.io";
import { findTimerState } from "@/db/games/queries/find-timer-state";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { createEngine } from "@/timer/game-store";
import { scheduleGame } from "@/timer/scheduler";
import { makeTimerBroadcaster } from "@/socket/handlers/timer/broadcast-timer";

/**
 * Promote a game's saved timer configuration into a live, running timer.
 *
 * Called when a game is started. If the director saved a timer configuration
 * during setup (a "configured but not started" state — `phase: null`,
 * `isRunning: false`), this builds a fresh running engine from that config,
 * persists it, broadcasts the running state, and schedules its first phase
 * transition. If no timer was configured, or a live timer already exists (the
 * timer has already been started), this is a no-op.
 *
 * Timer promotion is best-effort: failures are logged and swallowed so a timer
 * problem can never block a game from starting.
 */
export async function promoteTimerAtGameStart(
  gameId: string,
  io: Server,
): Promise<void> {
  try {
    const saved = await findTimerState(gameId);

    // No configuration saved: the timer is optional, so there is nothing to
    // start.
    if (!saved) return;

    // Already live (running or a real phase in progress): a timer that has been
    // started must not be reset by game start. A configured-but-not-started
    // timer has a null phase; anything else means it is already a live timer.
    if (saved.phase !== null || saved.isRunning) return;

    const broadcast = makeTimerBroadcaster(io);

    const engine = await createEngine(
      gameId,
      saved.boardsPerRound,
      saved.totalRounds,
      saved.playDuration,
      saved.moveDuration,
      { breaks: saved.breaks, warningSeconds: saved.warningSeconds },
    );

    // Begin running immediately: the game has started, so the clock starts too.
    engine.start();

    await updateTimerState(gameId, engine.getState());
    broadcast(gameId, engine.getState());
    scheduleGame(gameId, engine, { updateTimerState, broadcast });
  } catch (err) {
    console.error(
      `Failed to promote timer at game start for game ${gameId}:`,
      err,
    );
  }
}
