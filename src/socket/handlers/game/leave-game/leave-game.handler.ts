import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { registerHandler } from "@/socket/handlers/handler-wrapper";

const payloadSchema = z.object({
  gameId: z.string().min(1),
});

export function registerLeaveGameHandler(socket: Socket, io: Server) {
  registerHandler(socket, io, SocketEvents.LEAVE_GAME, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      socket.leave(Rooms.game(payload.gameId));
      ack({ success: true, data: undefined });
    },
  });
}
