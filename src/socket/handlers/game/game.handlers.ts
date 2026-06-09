import { Server, Socket } from "socket.io";
import { registerCreateGameHandler } from "@/socket/handlers/game/create-game/create-game.handler";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";
import { registerCreatePairHandler } from "@/socket/handlers/game/create-pair/create-pair.handler";
import { registerSelectSeatHandler } from "@/socket/handlers/game/select-seat/select-seat";
import { registerSelectedMovementHandler } from "@/socket/handlers/game/select-movement/select-movement.handler";
import { registerLeaveGameHandler } from "@/socket/handlers/game/leave-game/leave-game.handler";

export function registerGameHandlers(socket: Socket, io: Server) {
  registerCreateGameHandler(socket, io);
  registerJoinGameHandler(socket);
  registerCreatePairHandler(socket, io);
  registerSelectSeatHandler(socket, io);
  registerSelectedMovementHandler(socket);
  registerLeaveGameHandler(socket);
}
