import { Server, Socket } from "socket.io";
import { SocketEvents } from "./socket-events";
import { Rooms } from "./rooms";

export function registerJoinGameHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.JOIN_GAME,
    async ({ gameId }: { gameId: string }, cb) => {
      try {
        socket.join(Rooms.game(gameId));

        cb?.({ success: true });
      } catch (err) {
        cb?.({ success: false });
      }
    },
  );
}
