import { SocketEvents } from "@/socket/socket-events";
import { Server, Socket } from "socket.io";
import { z } from "zod";
import { registerHandler } from "@/socket/handlers/handler-wrapper";
import { makeDirectorTimerRunner } from "./with-director-timer";
import { directorTimerFields } from "./payload";

const payloadSchema = z.object(directorTimerFields);

export function registerPauseTimerHandler(socket: Socket, io: Server) {
  const runCommand = makeDirectorTimerRunner(io);

  registerHandler(socket, io, SocketEvents.PAUSE_TIMER, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      // Pausing cancels any pending phase transition rather than re-arming one.
      await runCommand(payload, (engine) => engine.pause(), {
        reschedule: false,
      });
      ack({ success: true, data: undefined });
    },
  });
}
