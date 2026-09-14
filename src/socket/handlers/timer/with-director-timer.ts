import { Server } from "socket.io";
import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import { getEngine } from "@/timer/game-store";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { scheduleGame, cancelGameSchedule } from "@/timer/scheduler";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { HandlerError } from "@/socket/handlers/handler-wrapper";
import { makeTimerBroadcaster } from "./broadcast-timer";
import { SectionLetter } from "@/model/participants";

/** The director-mutation preamble every timer command shares. */
interface DirectorTimerPayload {
  gameId: string;
  section: SectionLetter;
  directorToken: string;
}

/**
 * Shared wiring for the director-authed timer command handlers (start, pause,
 * next round, previous, adjust time, update config). Every one of them:
 *
 *  1. validates the director token (→ Unauthorized),
 *  2. resolves the section's engine (→ Timer not found),
 *  3. runs a command-specific mutation on the engine,
 *  4. persists the new state and broadcasts it, then
 *  5. re-arms the phase scheduler — except pause, which cancels it instead.
 *
 * This factory owns 1, 2, 4 and 5 so each handler supplies only step 3 via
 * `apply`. Pass `reschedule: false` for pause (the schedule is cancelled rather
 * than re-armed). Throws {@link HandlerError} for the auth / missing-engine
 * cases, which `registerHandler` acks as user-facing failures.
 */
export function makeDirectorTimerRunner(io: Server) {
  const broadcast = makeTimerBroadcaster(io);

  return async function runDirectorTimerCommand(
    payload: DirectorTimerPayload,
    apply: (engine: BridgeTimerEngine) => void,
    options: { reschedule?: boolean } = {},
  ): Promise<void> {
    const { gameId, section, directorToken } = payload;

    if (!validateDirectorToken(directorToken, gameId)) {
      throw new HandlerError("Unauthorized");
    }

    const engine = await getEngine(gameId, section);
    if (!engine) throw new HandlerError("Timer not found");

    apply(engine);

    if (options.reschedule === false) {
      // Paused: drop any pending phase transition rather than re-arming one.
      cancelGameSchedule(gameId, section);
    }

    await updateTimerState(gameId, section, engine.getState());
    broadcast(gameId, section, engine.getState());

    if (options.reschedule !== false) {
      scheduleGame(gameId, section, engine, { updateTimerState, broadcast });
    }
  };
}
