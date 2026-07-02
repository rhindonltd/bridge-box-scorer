import { Server, Socket } from "socket.io";
import { registerCreateGameHandler } from "@/socket/handlers/game/create-game/create-game.handler";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";
import { registerSelectMovementHandler } from "@/socket/handlers/game/select-movement/select-movement.handler";
import { registerLeaveGameHandler } from "@/socket/handlers/game/leave-game/leave-game.handler";
import { registerCreateParticipantHandler } from "./create-participant/create-participant";

export function registerGameHandlers(socket: Socket, io: Server) {
  registerCreateGameHandler(socket, io);
  registerCreateParticipantHandler(socket, io);
  registerJoinGameHandler(socket);
  registerLeaveGameHandler(socket);
  registerSelectMovementHandler(socket);
}
