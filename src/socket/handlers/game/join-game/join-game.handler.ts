import { Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

export function registerJoinGameHandler(socket: Socket) {
  socket.on(
    SocketEvents.JOIN_GAME,
    async ({ gameId }: { gameId: string }, cb) => {
      try {
        socket.join(Rooms.game(gameId));

        cb?.({ success: true });
      } catch {
        cb?.({ success: false });
      }
    },
  );
}
