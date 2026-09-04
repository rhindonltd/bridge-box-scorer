import { Server, Socket } from "socket.io";
import { registerLeaderboardRequestHandler } from "./leaderboard-request.handler";
import { registerTravellerRequestHandler } from "./traveller-request.handler";
import { registerTravellerOverrideHandler } from "./traveller-override.handler";

/**
 * Handlers for live, DB-derived results features (leaderboard, traveller).
 * These follow the socket-only feature-context pattern: a read-only
 * `*:requestState` seeds initial state and joins a feature room, and mutations
 * elsewhere fan out occupancy-gated snapshots via `broadcastResultsChanged`.
 */
export function registerResultsHandlers(socket: Socket, io: Server) {
  registerLeaderboardRequestHandler(socket, io);
  registerTravellerRequestHandler(socket, io);
  registerTravellerOverrideHandler(socket, io);
}
