import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { Server, Socket } from "socket.io";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { scheduleGame } from "@/timer/scheduler";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { makeTimerBroadcaster } from "./broadcast-timer";
import { directorTimerFields } from "./payload";

const payloadSchema = z.object(directorTimerFields);

export function registerNextRoundHandler(socket: Socket, io: Server) {
  const broadcast = makeTimerBroadcaster(io);

  registerHandler(socket, io, SocketEvents.NEXT_ROUND_TIMER, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      const { gameId, section, directorToken } = payload;
      if (!validateDirectorToken(directorToken, gameId)) {
        throw new HandlerError("Unauthorized");
      }

      const engine = await getEngine(gameId, section);
      if (!engine) throw new HandlerError("Timer not found");

      engine.nextPhase();

      await updateTimerState(gameId, section, engine.getState());
      broadcast(gameId, section, engine.getState());

      scheduleGame(gameId, section, engine, { updateTimerState, broadcast });

      ack({ success: true, data: undefined });
    },
  });
}
