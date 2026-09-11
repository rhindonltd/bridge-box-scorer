import { Server, Socket } from "socket.io";
import { registerCreateGameHandler } from "@/socket/handlers/game/create-game/create-game.handler";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";
import { registerSelectMovementHandler } from "@/socket/handlers/game/select-movement/select-movement.handler";
import { registerStartGameHandler } from "@/socket/handlers/game/start-game/start-game.handler";
import { registerLeaveGameHandler } from "@/socket/handlers/game/leave-game/leave-game.handler";
import { registerCreateParticipantHandler } from "./create-participant/create-participant";
import { registerEvictParticipantHandler } from "./evict-participant/evict-participant.handler";
import { registerShareCodeHandlers } from "./share-code/share-code.handler";
import { registerSubmitResultHandler } from "./submit-result/submit-result.handler";

// Section management (create/rename/delete/movement) and per-section table
// resize are HTTP routes (see src/app/api/games/[gameId]/sections/*), not socket
// events; the resulting live updates are broadcast from those routes.
export function registerGameHandlers(socket: Socket, io: Server) {
  registerCreateGameHandler(socket, io);
  registerCreateParticipantHandler(socket, io);
  registerEvictParticipantHandler(socket, io);
  registerJoinGameHandler(socket);
  registerLeaveGameHandler(socket);
  registerSelectMovementHandler(socket, io);
  registerStartGameHandler(socket, io);
  registerShareCodeHandlers(socket, io);
  registerSubmitResultHandler(socket, io);
}
