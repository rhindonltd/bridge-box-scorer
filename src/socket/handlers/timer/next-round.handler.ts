import { SocketEvents } from "@/socket/socket-events";
import { Server, Socket } from "socket.io";
import { z } from "zod";
import { registerHandler } from "@/socket/handlers/handler-wrapper";
import { makeDirectorTimerRunner } from "./with-director-timer";
import { directorTimerFields } from "./payload";

const payloadSchema = z.object(directorTimerFields);

export function registerNextRoundHandler(socket: Socket, io: Server) {
  const runCommand = makeDirectorTimerRunner(io);

  registerHandler(socket, io, SocketEvents.NEXT_ROUND_TIMER, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      await runCommand(payload, (engine) => engine.nextPhase());
      ack({ success: true, data: undefined });
    },
  });
}
