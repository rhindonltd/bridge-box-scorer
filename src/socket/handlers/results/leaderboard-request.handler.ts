import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { buildLeaderboardPayload } from "./broadcast-results";
import { registerRoomBackedRequest } from "./room-backed-request";

const payloadSchema = z.object({
  gameId: z.string().min(1),
});

type LeaderboardSnapshot = Awaited<ReturnType<typeof buildLeaderboardPayload>>;

/**
 * Read-only request for the current leaderboard snapshot. Returns
 * `{ leaderboard, sections }` (or null when the game db is missing) on the ack,
 * AND joins the socket to the leaderboard room so it receives pushed
 * `leaderboard:sync` updates. Requesting implies "I am now viewing the
 * leaderboard"; a matching `leaderboard:leave` removes the socket on unmount.
 * No director auth — reading the leaderboard is public.
 *
 * A failure computing the leaderboard is treated as "no snapshot yet"
 * (`{ success: true, data: null }`), not an error, so the client stays in its
 * loading/empty state rather than surfacing a failure.
 */
export function registerLeaderboardRequestHandler(socket: Socket, io: Server) {
  registerRoomBackedRequest<
    z.infer<typeof payloadSchema>,
    z.infer<typeof payloadSchema>,
    LeaderboardSnapshot
  >(socket, io, {
    requestEvent: SocketEvents.REQUEST_STATE_LEADERBOARD,
    leaveEvent: SocketEvents.LEAVE_LEADERBOARD,
    schema: payloadSchema,
    room: ({ gameId }) => Rooms.leaderboard(gameId),
    buildSnapshot: (db, { gameId }) => buildLeaderboardPayload(db, gameId),
    errorLog: "Failed to load leaderboard",
  });
}
