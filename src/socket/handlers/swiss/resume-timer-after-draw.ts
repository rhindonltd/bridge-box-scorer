import { Server } from "socket.io";
import { getEngine } from "@/timer/game-store";
import { scheduleGame, cancelGameSchedule } from "@/timer/scheduler";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { makeTimerBroadcaster } from "@/socket/handlers/timer/broadcast-timer";
import { SectionLetter } from "@/model/participants";
import { logger } from "@/lib/log";

/**
 * Resume a Swiss section's timer into the next round's play after the director
 * has committed that round's draw.
 *
 * A Swiss timer parks in the open-ended `awaitingDraw` phase at the end of each
 * round (see {@link import("@/timer/bridge-timer-engine").BridgeTimerEngine}).
 * Committing the next round's draw is the signal to start that round's clock:
 * this advances the engine out of `awaitingDraw` into play, persists, pushes a
 * fresh `timer:sync`, and arms the scheduler for the new play phase.
 *
 * A no-op (beyond a safe reschedule) when there is no engine, or the engine is
 * not in `awaitingDraw` — so it is harmless to call after every draw commit
 * (e.g. a game with no timer configured, or a mid-round director re-draw). Any
 * failure is logged and swallowed: the draw itself has already succeeded, so a
 * timer hiccup must not fail the commit.
 */
export async function resumeTimerAfterDraw(
  io: Server,
  gameId: string,
  section: SectionLetter,
): Promise<void> {
  try {
    const engine = await getEngine(gameId, section);
    if (!engine) return;

    // Only act when the timer is actually waiting for this draw. resumeAfterDraw
    // is itself a no-op off `awaitingDraw`, but guarding here avoids a needless
    // persist/broadcast/reschedule on every unrelated draw commit.
    if (engine.getState().phase !== "awaitingDraw") return;

    engine.resumeAfterDraw();

    await updateTimerState(gameId, section, engine.getState());
    makeTimerBroadcaster(io)(gameId, section, engine.getState());

    // The new play phase is timed, so (re)arm its auto-advance. Cancel any
    // stale schedule first for safety — awaitingDraw never scheduled one, but a
    // belt-and-braces cancel keeps a single live timeout invariant.
    cancelGameSchedule(gameId, section);
    scheduleGame(gameId, section, engine, { updateTimerState, broadcast: makeTimerBroadcaster(io) });
  } catch (err) {
    logger.error(
      { err, gameId, section },
      "Failed to resume timer after Swiss draw",
    );
  }
}
