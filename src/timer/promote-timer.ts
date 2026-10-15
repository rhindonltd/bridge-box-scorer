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
import { buildConfiguredTimerState, TimerState } from "@/timer/timer-state";
import { buildDefaultTimerConfigFor } from "@/timer/default-timer-config";
import { getDb } from "@/db/games";
import { findSections } from "@/db/games/queries/find-sections";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { makeTimerBroadcaster } from "@/socket/handlers/timer/broadcast-timer";
import { logger } from "@/lib/log";

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
 * Build the "configured but not started" default timer state for a section that
 * has a movement but no saved timer — i.e. the director never visited the timer
 * page for it. Mirrors what the setup form would have saved had they opened it
 * and accepted the defaults: the shared default phase lengths sized to the
 * section's movement. Returns null when the section has no movement, or its
 * structure can't be derived, so the caller leaves that section timer-less.
 */
async function buildDefaultSectionState(
  gameId: string,
  section: SectionLetter,
): Promise<TimerState | null> {
  const db = await getDb(gameId);
  if (!db) return null;

  const movement = await getSectionMovement(db, section);
  if (!movement) return null;

  const config = await buildDefaultTimerConfigFor(movement);
  if (!config) return null;

  return buildConfiguredTimerState(config);
}

/**
 * Promote every section's timer into a live, running timer when a game starts.
 *
 * Each section is handled independently:
 * - A section the director configured during setup (a "configured but not
 *   started" state — `phase: null`, `isRunning: false`) begins running.
 * - A section with NO saved timer gets a default timer created from the timer
 *   page's defaults (sized to its movement) and then started, so a director who
 *   never opened the timer page still gets a running clock at game start.
 * - A section whose timer is already live is left untouched.
 *
 * One section failing never affects the others or the game start itself.
 */
export async function promoteTimerAtGameStart(
  gameId: string,
  io: Server,
): Promise<void> {
  try {
    const saved = await findAllTimerStates(gameId);
    const sections = await findSections(await resolveDb(gameId));

    const broadcast = makeTimerBroadcaster(io);

    for (const { section } of sections) {
      let state = saved.get(section);

      // No saved timer for this section: synthesise the default config the
      // director would have got from the timer page, persist it, then promote
      // it exactly like a configured one. Best-effort — a section whose default
      // can't be built (no movement/structure) is simply left without a timer.
      if (!state) {
        const defaultState = await buildDefaultSectionState(gameId, section);
        if (!defaultState) continue;
        await updateTimerState(gameId, section, defaultState);
        state = defaultState;
      }

      await promoteSection(gameId, section, state, broadcast);
    }
  } catch (err) {
    logger.error({ err, gameId }, "Failed to promote timers at game start");
  }
}

/** Resolve the per-game db, throwing a clear error when the game is missing. */
async function resolveDb(gameId: string) {
  const db = await getDb(gameId);
  if (!db) throw new Error(`Game db does not exist for ${gameId}`);
  return db;
}

// Re-exported so existing single-section callers/tests that only need one
// section can still read a section's state directly.
export { findTimerState };
