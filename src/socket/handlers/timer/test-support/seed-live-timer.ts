import type { Server } from "socket.io";

import { createEngine } from "@/timer/game-store";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { makeTimerBroadcaster } from "@/socket/handlers/timer/broadcast-timer";
import type { SectionLetter } from "@/model/participants";
import type { TimerState } from "@/timer/timer-state";

/**
 * TEST SUPPORT — seed a live, engine-backed timer for a section directly
 * (bypassing any socket event) and broadcast its state.
 *
 * This creates a real {@link createEngine} timer, persists it via
 * `updateTimerState`, and emits `timer:sync` through the shared broadcaster —
 * i.e. the "bring a timer to life" work, without starting the clock. It exists
 * so integration tests can set up a running timer to exercise other handlers
 * (request-state snapshots, break-problem broadcasts) now that there is no
 * production event that creates a timer ad hoc. In production, timers come to
 * life only via `promoteTimerAtGameStart` when a game is started.
 *
 * Intended for tests that use the real engine/game-store with a mocked DB +
 * scheduler.
 */
export async function seedLiveTimer(
  io: Server,
  params: {
    gameId: string;
    section: SectionLetter;
    boardsPerRound: number;
    totalRounds: number;
    playDuration: number;
    moveDuration: number;
    breaks?: TimerState["breaks"];
    warningSeconds?: number;
  },
): Promise<void> {
  const {
    gameId,
    section,
    boardsPerRound,
    totalRounds,
    playDuration,
    moveDuration,
    breaks,
    warningSeconds,
  } = params;

  const engine = await createEngine(
    gameId,
    section,
    boardsPerRound,
    totalRounds,
    playDuration,
    moveDuration,
    { breaks, warningSeconds },
  );

  await updateTimerState(gameId, section, engine.getState());
  makeTimerBroadcaster(io)(gameId, section, engine.getState());
}
