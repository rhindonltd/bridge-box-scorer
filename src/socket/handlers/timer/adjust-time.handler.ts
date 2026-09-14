import { SocketEvents } from "@/socket/socket-events";
import { Server, Socket } from "socket.io";
import { z } from "zod";
import { registerHandler } from "@/socket/handlers/handler-wrapper";
import { makeDirectorTimerRunner } from "./with-director-timer";
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
  const runCommand = makeDirectorTimerRunner(io);

  registerHandler(socket, io, SocketEvents.ADJUST_TIME_TIMER, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      const { deltaSeconds, applyToFutureSameType } = payload;
      await runCommand(payload, (engine) =>
        engine.adjustTime(deltaSeconds * 1000, applyToFutureSameType ?? false),
      );
      ack({ success: true, data: undefined });
    },
  });
}
