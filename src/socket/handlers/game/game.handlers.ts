import { Server, Socket } from "socket.io";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";
import { registerSelectMovementHandler } from "@/socket/handlers/game/select-movement/select-movement.handler";
import { registerLeaveGameHandler } from "@/socket/handlers/game/leave-game/leave-game.handler";
import { registerCreateParticipantHandler } from "./create-participant/create-participant";
import { registerShareCodeHandlers } from "./share-code/share-code.handler";
import { registerSubmitResultHandler } from "./submit-result/submit-result.handler";

// Director-only / one-shot mutations that are HTTP routes rather than socket
// events:
// - game creation (POST /api/games)
// - starting a game (POST /api/games/[gameId]/start)
// - section management + per-section table resize (src/app/api/games/[gameId]/sections/*)
// - participant eviction (DELETE src/app/api/games/[gameId]/participants/[seat])
// Their resulting live updates (JOINABLE_GAMES / GAME_UPDATED / SECTION_UPDATED /
// TIMER_CLEARED / PARTICIPANTS / timer promotion) are broadcast from those
// routes. Player self-seating (CREATE_PARTICIPANT) stays on the socket as a
// live hot path.
export function registerGameHandlers(socket: Socket, io: Server) {
  registerCreateParticipantHandler(socket, io);
  registerJoinGameHandler(socket);
  registerLeaveGameHandler(socket);
  registerSelectMovementHandler(socket, io);
  registerShareCodeHandlers(socket, io);
  registerSubmitResultHandler(socket, io);
}
