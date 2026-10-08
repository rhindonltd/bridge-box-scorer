import { Server, Socket } from "socket.io";
import { registerLeaderboardRequestHandler } from "./leaderboard-request.handler";
import { registerTravellerRequestHandler } from "./traveller-request.handler";
import { registerRoundResultsRequestHandler } from "./round-results-request.handler";
import { registerTravellerOverrideHandler } from "./traveller-override.handler";
import { registerCancelBoardHandler } from "./cancel-board.handler";
import { registerRemoveTeamsBoardHandler } from "./remove-teams-board.handler";
import { registerVoidTeamsMatchHandler } from "./void-teams-match.handler";
import { registerVoidPairsMatchHandler } from "./void-pairs-match.handler";
import { registerMarkMismatchHandler } from "./mark-mismatch.handler";
import { registerDealSubmitHandler } from "./deal-submit.handler";
import { registerDealOverrideHandler } from "./deal-override.handler";

/**
 * Handlers for live, DB-derived results features (leaderboard, traveller).
 * These follow the socket-only feature-context pattern: a read-only
 * `*:requestState` seeds initial state and joins a feature room, and mutations
 * elsewhere fan out occupancy-gated snapshots via `broadcastResultsChanged`.
 */
export function registerResultsHandlers(socket: Socket, io: Server) {
  registerLeaderboardRequestHandler(socket, io);
  registerTravellerRequestHandler(socket, io);
  registerRoundResultsRequestHandler(socket, io);
  registerTravellerOverrideHandler(socket, io);
  registerCancelBoardHandler(socket, io);
  registerRemoveTeamsBoardHandler(socket, io);
  registerVoidTeamsMatchHandler(socket, io);
  registerVoidPairsMatchHandler(socket, io);
  registerMarkMismatchHandler(socket, io);
  registerDealSubmitHandler(socket, io);
  registerDealOverrideHandler(socket, io);
}
