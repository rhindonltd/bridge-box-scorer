import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { getDb } from "@/db/games";
import { registerHandler } from "@/socket/handlers/handler-wrapper";
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
 *
 * A failure computing the traveller is treated as "no snapshot yet"
 * (`{ success: true, data: null }`), not an error, so the handler owns its own
 * try/catch rather than letting the wrapper turn it into a failure ack.
 */
export function registerTravellerRequestHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, TravellerSnapshot>(
    socket,
    io,
    SocketEvents.REQUEST_STATE_TRAVELLER,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack, log }) => {
        const { gameId, boardNumber } = payload;

        socket.join(Rooms.traveller(gameId, boardNumber));

        try {
          const db = await getDb(gameId);
          const snapshot = db
            ? await buildTravellerPayload(db, boardNumber)
            : null;
          ack({ success: true, data: snapshot });
        } catch (err) {
          log.error(
            { err, gameId, boardNumber },
            "Failed to load traveller",
          );
          ack({ success: true, data: null });
        }
      },
    },
  );

  socket.on(SocketEvents.LEAVE_TRAVELLER, (payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) return;
    socket.leave(Rooms.traveller(parsed.data.gameId, parsed.data.boardNumber));
  });
}
