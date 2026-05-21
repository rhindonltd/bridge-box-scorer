import { Server, Socket } from "socket.io";
import { SocketEvents } from "./socket-events";
import { Rooms } from "./rooms";

export function registerLeaveGameHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.LEAVE_GAME,
    async ({ gameId }: { gameId: string }, cb) => {
      try {
        socket.leave(Rooms.game(gameId));

        cb?.({ success: true });
      } catch (err) {
        cb?.({ success: false });
      }
    },
  );
}
