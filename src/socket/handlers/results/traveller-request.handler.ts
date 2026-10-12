import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { buildTravellerPayload } from "./broadcast-results";
import { registerRoomBackedRequest } from "./room-backed-request";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  boardNumber: z.number().int().positive(),
});

type TravellerSnapshot = Awaited<ReturnType<typeof buildTravellerPayload>>;

/**
 * Read-only request for a single board's traveller snapshot. Returns
 * `{ instances }` (or null when the game db is missing) on the ack, AND joins
 * the socket to that board's traveller room so it receives pushed
 * `traveller:sync` updates. Requesting implies "I am now viewing this board's
 * traveller"; a matching `traveller:leave` removes the socket on unmount or
 * board switch. No director auth — reading a traveller is public.
 *
 * A failure computing the traveller is treated as "no snapshot yet"
 * (`{ success: true, data: null }`), not an error.
 */
export function registerTravellerRequestHandler(socket: Socket, io: Server) {
  registerRoomBackedRequest<
    z.infer<typeof payloadSchema>,
    z.infer<typeof payloadSchema>,
    TravellerSnapshot
  >(socket, io, {
    requestEvent: SocketEvents.REQUEST_STATE_TRAVELLER,
    leaveEvent: SocketEvents.LEAVE_TRAVELLER,
    schema: payloadSchema,
    room: ({ gameId, boardNumber }) => Rooms.traveller(gameId, boardNumber),
    buildSnapshot: (db, { boardNumber }) =>
      buildTravellerPayload(db, boardNumber),
    errorLog: "Failed to load traveller",
  });
}
