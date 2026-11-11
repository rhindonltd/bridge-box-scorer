import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { buildPairScorecard } from "@/services/scorecard-service";
import type { PairScorecard } from "@/model/scorecard";
import { registerRoomBackedRequest } from "./room-backed-request";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  seat: z.string().min(1),
});

/**
 * Read-only request for a seat's personal Scorecard. Returns the scorecard (or
 * null — not a pairs game, not started, or the game db is missing) on the ack,
 * AND joins the socket to that seat's scorecard room so it receives pushed
 * `scorecard:sync` updates as results come in. A matching `scorecard:leave`
 * removes it on unmount.
 *
 * No auth, like the leaderboard and travellers: every board's results are
 * already public on the travellers, so a pair's own scorecard reveals nothing
 * new.
 */
export function registerScorecardRequestHandler(socket: Socket, io: Server) {
  registerRoomBackedRequest<
    z.infer<typeof payloadSchema>,
    z.infer<typeof payloadSchema>,
    PairScorecard | null
  >(socket, io, {
    requestEvent: SocketEvents.REQUEST_STATE_SCORECARD,
    leaveEvent: SocketEvents.LEAVE_SCORECARD,
    schema: payloadSchema,
    room: ({ gameId, seat }) => Rooms.scorecard(gameId, seat),
    buildSnapshot: (db, { gameId, seat }) =>
      buildPairScorecard(db, gameId, seat),
    errorLog: "Failed to load scorecard",
  });
}
