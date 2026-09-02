import { Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

/**
 * Join a game's room, and — when the client supplies its section — also the
 * section-scoped room so it receives section-specific updates (e.g. that
 * section's movement changing) without being disturbed by other sections.
 */
export function registerJoinGameHandler(socket: Socket) {
  socket.on(
    SocketEvents.JOIN_GAME,
    async (
      { gameId, section }: { gameId: string; section?: string },
      cb,
    ) => {
      try {
        socket.join(Rooms.game(gameId));

        if (section) {
          socket.join(Rooms.section(gameId, section));
        }

        cb?.({ success: true });
      } catch {
        cb?.({ success: false });
      }
    },
  );
}
