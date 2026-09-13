import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { registerHandler } from "@/socket/handlers/handler-wrapper";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  section: z.string().min(1).optional(),
});

/**
 * Join a game's room, and — when the client supplies its section — also the
 * section-scoped room so it receives section-specific updates (e.g. that
 * section's movement changing) without being disturbed by other sections.
 *
 * This handler is intentionally "dumb": it only manages room membership. Screens
 * that need current feature state (e.g. the timer) load it via their own
 * feature-scoped request (see `timer:requestState`) rather than having every
 * join replay every feature's state.
 */
export function registerJoinGameHandler(socket: Socket, io: Server) {
  registerHandler(socket, io, SocketEvents.JOIN_GAME, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      const { gameId, section } = payload;

      socket.join(Rooms.game(gameId));

      if (section) {
        socket.join(Rooms.section(gameId, section));
      }

      ack({ success: true, data: undefined });
    },
  });
}
