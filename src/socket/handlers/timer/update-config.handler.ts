import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { scheduleGame } from "@/timer/scheduler";
import { Server, Socket } from "socket.io";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { makeTimerBroadcaster } from "./broadcast-timer";
import {
  directorTimerFields,
  timerConfigExtras,
  toBreakConfigs,
} from "./payload";

const payloadSchema = z.object({
  ...directorTimerFields,
  boardsPerRound: z.number().int().positive(),
  totalRounds: z.number().int().positive(),
  playDuration: z.number().int().positive(),
  moveDuration: z.number().int().positive(),
  ...timerConfigExtras,
});

export function registerUpdateConfigHandler(socket: Socket, io: Server) {
  const broadcast = makeTimerBroadcaster(io);

  registerHandler(socket, io, SocketEvents.UPDATE_CONFIG_TIMER, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      const {
        gameId,
        section,
        directorToken,
        boardsPerRound,
        totalRounds,
        playDuration,
        moveDuration,
        breaks,
        warningSeconds,
      } = payload;
      if (!validateDirectorToken(directorToken, gameId)) {
        throw new HandlerError("Unauthorized");
      }

      const engine = await getEngine(gameId, section);
      if (!engine) throw new HandlerError("Timer not found");

      engine.updateConfig(
        boardsPerRound,
        totalRounds,
        playDuration,
        moveDuration,
        {
          breaks: toBreakConfigs(breaks),
          warningSeconds,
        },
      );

      await updateTimerState(gameId, section, engine.getState());
      broadcast(gameId, section, engine.getState());

      scheduleGame(gameId, section, engine, { updateTimerState, broadcast });

      ack({ success: true, data: undefined });
    },
  });
}
