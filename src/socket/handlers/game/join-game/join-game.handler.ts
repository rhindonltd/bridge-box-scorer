import { Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

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
