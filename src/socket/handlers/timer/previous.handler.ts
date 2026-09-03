import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { Server, Socket } from "socket.io";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { scheduleGame } from "@/timer/scheduler";
import { assertDirector } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { makeTimerBroadcaster } from "./broadcast-timer";
import { directorTimerFields } from "./payload";

/**
 * "Previous" is a two-step control. The first press restarts the current phase;
 * a second press (while the phase is already at full duration) steps back to
 * the previous phase. The `restart` flag lets the client request the restart
 * step explicitly; when false the handler steps to the previous phase.
 */
const payloadSchema = z.object({
  ...directorTimerFields,
  restart: z.boolean().optional(),
});

export function registerPreviousHandler(socket: Socket, io: Server) {
  const broadcast = makeTimerBroadcaster(io);

  socket.on(SocketEvents.PREVIOUS_TIMER, async (payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn("Invalid PREVIOUS_TIMER payload:", parsed.error.message);
      return;
    }

    const { gameId, directorToken, restart } = parsed.data;
    if (!assertDirector(directorToken, gameId)) return;

    try {
      const engine = await getEngine(gameId);
      if (!engine) return;

      if (restart) {
        engine.restartPhase();
      } else {
        engine.previousPhase();
      }

      await updateTimerState(gameId, engine.getState());
      broadcast(gameId, engine.getState());

      scheduleGame(gameId, engine, { updateTimerState, broadcast });
    } catch (err) {
      console.error(`Failed to step timer back for game ${gameId}:`, err);
    }
  });
}
