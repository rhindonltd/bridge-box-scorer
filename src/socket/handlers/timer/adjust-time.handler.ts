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

/**
 * Add or subtract time on the current phase. `deltaSeconds` may be negative.
 * When `applyToFutureSameType` is true the change also adjusts the stored
 * play/move duration so all subsequent phases of that type inherit it; phases
 * that have already elapsed are never modified.
 */
const payloadSchema = z.object({
  ...directorTimerFields,
  deltaSeconds: z.number().int(),
  applyToFutureSameType: z.boolean().optional(),
});

export function registerAdjustTimeHandler(socket: Socket, io: Server) {
  const broadcast = makeTimerBroadcaster(io);

  registerHandler(socket, io, SocketEvents.ADJUST_TIME_TIMER, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      const {
        gameId,
        section,
        directorToken,
        deltaSeconds,
        applyToFutureSameType,
      } = payload;
      if (!validateDirectorToken(directorToken, gameId)) {
        throw new HandlerError("Unauthorized");
      }

      const engine = await getEngine(gameId, section);
      if (!engine) throw new HandlerError("Timer not found");

      engine.adjustTime(deltaSeconds * 1000, applyToFutureSameType ?? false);

      await updateTimerState(gameId, section, engine.getState());
      broadcast(gameId, section, engine.getState());

      scheduleGame(gameId, section, engine, { updateTimerState, broadcast });

      ack({ success: true, data: undefined });
    },
  });
}
