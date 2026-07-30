import { Server, Socket } from "socket.io";
import { registerCreateGameHandler } from "@/socket/handlers/game/create-game/create-game.handler";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";
import { registerSelectMovementHandler } from "@/socket/handlers/game/select-movement/select-movement.handler";
import { registerLeaveGameHandler } from "@/socket/handlers/game/leave-game/leave-game.handler";
import { registerCreateParticipantHandler } from "./create-participant/create-participant";
import { registerUpdateTablesHandler } from "./update-tables/update-tables.handler";
import { registerEvictParticipantHandler } from "./evict-participant/evict-participant.handler";
import { registerShareCodeHandlers } from "./share-code/share-code.handler";

export function registerGameHandlers(socket: Socket, io: Server) {
  registerCreateGameHandler(socket, io);
  registerCreateParticipantHandler(socket, io);
  registerEvictParticipantHandler(socket, io);
  registerJoinGameHandler(socket);
  registerLeaveGameHandler(socket);
  registerSelectMovementHandler(socket);
  registerUpdateTablesHandler(socket, io);
  registerShareCodeHandlers(socket, io);
}
