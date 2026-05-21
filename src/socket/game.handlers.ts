import { Server, Socket } from "socket.io";
import { registerCreateGameHandler } from "@/socket/create-game.handler";
import { registerJoinGameHandler } from "@/socket/join-game.handler";
import { registerSelectSeatHandler } from "@/socket/select-seat";
import { registerSelectedMovementHandler } from "@/socket/select-movement.handler";
import { registerLeaveGameHandler } from "@/socket/leave-game.handler";

export function registerGameHandlers(socket: Socket, io: Server) {
  registerCreateGameHandler(socket, io);
  registerJoinGameHandler(socket, io);
  registerSelectSeatHandler(socket, io);
  registerSelectedMovementHandler(socket, io);
  registerLeaveGameHandler(socket, io);
}
