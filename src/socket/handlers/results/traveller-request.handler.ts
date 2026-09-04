import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { getDb } from "@/db/games";
import { SocketResponse } from "@/socket/socket-response";
import { buildTravellerPayload } from "./broadcast-results";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  boardNumber: z.number().int().positive(),
});

type TravellerSnapshot = Awaited<
  ReturnType<typeof buildTravellerPayload>
> | null;

/**
 * Read-only request for a single board's traveller snapshot. Returns
 * `{ instances }` (or null when the game db is missing) on the ack, AND joins
 * the socket to that board's traveller room so it receives pushed
 * `traveller:sync` updates. Requesting implies "I am now viewing this board's
 * traveller"; a matching `traveller:leave` removes the socket on unmount or
 * board switch. No director auth — reading a traveller is public.
 */
export function registerTravellerRequestHandler(socket: Socket, _io: Server) {
  socket.on(
    SocketEvents.REQUEST_STATE_TRAVELLER,
    async (
      payload: unknown,
      cb?: (response: SocketResponse<TravellerSnapshot>) => void,
    ) => {
      const parsed = payloadSchema.safeParse(payload);
      if (!parsed.success) {
        cb?.({ success: false, error: "Invalid payload" });
        return;
      }

      const { gameId, boardNumber } = parsed.data;

      try {
        socket.join(Rooms.traveller(gameId, boardNumber));

        const db = await getDb(gameId);
        const snapshot = db
          ? await buildTravellerPayload(db, boardNumber)
          : null;
        cb?.({ success: true, data: snapshot });
      } catch (err) {
        console.error(
          `Failed to load traveller for game ${gameId} board ${boardNumber}:`,
          err,
        );
        cb?.({ success: true, data: null });
      }
    },
  );

  socket.on(SocketEvents.LEAVE_TRAVELLER, (payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) return;
    socket.leave(Rooms.traveller(parsed.data.gameId, parsed.data.boardNumber));
  });
}
