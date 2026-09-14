import { SocketEvents } from "@/socket/socket-events";
import { Server, Socket } from "socket.io";
import { z } from "zod";
import { registerHandler } from "@/socket/handlers/handler-wrapper";
import { makeDirectorTimerRunner } from "./with-director-timer";
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
  const runCommand = makeDirectorTimerRunner(io);

  registerHandler(socket, io, SocketEvents.UPDATE_CONFIG_TIMER, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      const {
        boardsPerRound,
        totalRounds,
        playDuration,
        moveDuration,
        breaks,
        warningSeconds,
        timingMode,
      } = payload;

      await runCommand(payload, (engine) =>
        engine.updateConfig(
          boardsPerRound,
          totalRounds,
          playDuration,
          moveDuration,
          {
            breaks: toBreakConfigs(breaks),
            warningSeconds,
            timingMode,
          },
        ),
      );

      ack({ success: true, data: undefined });
    },
  });
}
