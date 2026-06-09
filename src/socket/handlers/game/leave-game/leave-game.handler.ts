import { Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

export function registerLeaveGameHandler(socket: Socket) {
  socket.on(
    SocketEvents.LEAVE_GAME,
    async ({ gameId }: { gameId: string }, cb) => {
      try {
        socket.leave(Rooms.game(gameId));

        cb?.({ success: true });
      } catch {
        cb?.({ success: false });
      }
    },
  );
}
