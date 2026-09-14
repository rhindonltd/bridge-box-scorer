import { SocketEvents } from "@/socket/socket-events";
import { Server, Socket } from "socket.io";
import { z } from "zod";
import { registerHandler } from "@/socket/handlers/handler-wrapper";
import { makeDirectorTimerRunner } from "./with-director-timer";
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
  const runCommand = makeDirectorTimerRunner(io);

  registerHandler(socket, io, SocketEvents.PREVIOUS_TIMER, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      await runCommand(payload, (engine) => {
        if (payload.restart) {
          engine.restartPhase();
        } else {
          engine.previousPhase();
        }
      });
      ack({ success: true, data: undefined });
    },
  });
}
