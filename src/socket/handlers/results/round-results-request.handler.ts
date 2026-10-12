import { z } from "zod";
import { Server, Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { getBoardInstances } from "@/services/board-service";
import { registerRoomBackedRequest } from "./room-backed-request";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  boardNumbers: z.array(z.number().int().positive()).min(1).max(64),
});

const leaveSchema = z.object({ gameId: z.string().min(1) });

type RoundResultsSnapshot = {
  boards: {
    boardNumber: number;
    instances: Awaited<ReturnType<typeof getBoardInstances>>;
  }[];
};

/**
 * Request the board instances for a set of boards at once — the data the
 * post-round "team results" summary needs (a teams game only). Returns
 * `{ boards: [{ boardNumber, instances }] }` on the ack (or null when the game
 * db is missing), AND joins the socket to the game's round-results room so a
 * late result from the other room is pushed as a `roundResults:sync` (a single
 * changed board) while the player is on the summary. A matching
 * `roundResults:leave` (carrying only `gameId`) removes the socket on unmount.
 * No director auth — reading results is public.
 *
 * A failure computing the snapshot is treated as "no snapshot yet"
 * (`{ success: true, data: null }`), matching the traveller request handler.
 */
export function registerRoundResultsRequestHandler(
  socket: Socket,
  io: Server,
) {
  registerRoomBackedRequest<
    z.infer<typeof payloadSchema>,
    z.infer<typeof leaveSchema>,
    RoundResultsSnapshot
  >(socket, io, {
    requestEvent: SocketEvents.REQUEST_STATE_ROUND_RESULTS,
    leaveEvent: SocketEvents.LEAVE_ROUND_RESULTS,
    schema: payloadSchema,
    leaveSchema,
    room: ({ gameId }) => Rooms.roundResults(gameId),
    buildSnapshot: async (db, { boardNumbers }) => ({
      boards: await Promise.all(
        boardNumbers.map(async (boardNumber) => ({
          boardNumber,
          instances: await getBoardInstances(db, boardNumber),
        })),
      ),
    }),
    errorLog: "Failed to load round results",
  });
}
