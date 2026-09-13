import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { scheduleGame } from "@/timer/scheduler";
import { Server, Socket } from "socket.io";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { makeTimerBroadcaster } from "./broadcast-timer";
import { directorTimerFields } from "./payload";

/**
 * `restart` steps the current phase back to its start; otherwise the handler
 * steps to the previous phase.
 */
const payloadSchema = z.object({
  ...directorTimerFields,
  restart: z.boolean().optional(),
});

export function registerPreviousHandler(socket: Socket, io: Server) {
  const broadcast = makeTimerBroadcaster(io);

  registerHandler(socket, io, SocketEvents.PREVIOUS_TIMER, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      const { gameId, section, directorToken, restart } = payload;
      if (!validateDirectorToken(directorToken, gameId)) {
        throw new HandlerError("Unauthorized");
      }

      const engine = await getEngine(gameId, section);
      if (!engine) throw new HandlerError("Timer not found");

      if (restart) {
        engine.restartPhase();
      } else {
        engine.previousPhase();
      }

      await updateTimerState(gameId, section, engine.getState());
      broadcast(gameId, section, engine.getState());

      scheduleGame(gameId, section, engine, { updateTimerState, broadcast });

      ack({ success: true, data: undefined });
    },
  });
}
