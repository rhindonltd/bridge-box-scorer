import { Server, Socket } from "socket.io";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";
import { registerSelectMovementHandler } from "@/socket/handlers/game/select-movement/select-movement.handler";
import { registerLeaveGameHandler } from "@/socket/handlers/game/leave-game/leave-game.handler";
import { registerCreateParticipantHandler } from "./create-participant/create-participant";
import { registerLeaveTableHandler } from "./leave-table/leave-table.handler";
import { registerSeatTransferHandlers } from "./seat-transfer/seat-transfer.handler";
import { registerSubmitResultHandler } from "./submit-result/submit-result.handler";

// Director-only / one-shot mutations that are HTTP routes rather than socket
// events:
// - game creation (POST /api/games)
// - starting a game (POST /api/games/[gameId]/start)
// - director share codes: generate (POST /api/games/[gameId]/share-code) and
//   claim (POST /api/director-codes/claim)
// - section management + per-section table resize (src/app/api/games/[gameId]/sections/*)
// - participant eviction (DELETE src/app/api/games/[gameId]/participants/[seat])
// Their resulting live updates (JOINABLE_GAMES / GAME_UPDATED / SECTION_UPDATED /
// TIMER_CLEARED / PARTICIPANTS / timer promotion) are broadcast from those
// routes. Player self-seating (CREATE_PARTICIPANT) stays on the socket as a
// live hot path — as are a player leaving their seat before start
// (LEAVE_TABLE) and moving their seat to another device (CREATE_SEAT_TRANSFER /
// CLAIM_SEAT_TRANSFER), all authed by the seat's own token.
export function registerGameHandlers(socket: Socket, io: Server) {
  registerCreateParticipantHandler(socket, io);
  registerLeaveTableHandler(socket, io);
  registerSeatTransferHandlers(socket, io);
  registerJoinGameHandler(socket);
  registerLeaveGameHandler(socket);
  registerSelectMovementHandler(socket, io);
  registerSubmitResultHandler(socket, io);
}
