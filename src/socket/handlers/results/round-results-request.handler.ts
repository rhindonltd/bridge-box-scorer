import { z } from "zod";
import { Server, Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { getDb } from "@/db/games";
import { registerHandler } from "@/socket/handlers/handler-wrapper";
import { getBoardInstances } from "@/services/board-service";

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
} | null;

/**
 * Request the board instances for a set of boards at once — the data the
 * post-round "team results" summary needs (a teams game only). Returns
 * `{ boards: [{ boardNumber, instances }] }` on the ack (or null when the game
 * db is missing), AND joins the socket to the game's round-results room so a
 * late result from the other room is pushed as a `roundResults:sync` (a single
 * changed board) while the player is on the summary. A matching
 * `roundResults:leave` removes the socket on unmount. No director auth —
 * reading results is public.
 *
 * A failure computing the snapshot is treated as "no snapshot yet"
 * (`{ success: true, data: null }`), matching the traveller request handler.
 */
export function registerRoundResultsRequestHandler(
  socket: Socket,
  io: Server,
) {
  registerHandler<z.infer<typeof payloadSchema>, RoundResultsSnapshot>(
    socket,
    io,
    SocketEvents.REQUEST_STATE_ROUND_RESULTS,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack, log }) => {
        const { gameId, boardNumbers } = payload;

        socket.join(Rooms.roundResults(gameId));

        try {
          const db = await getDb(gameId);
          if (!db) {
            ack({ success: true, data: null });
            return;
          }
          const boards = await Promise.all(
            boardNumbers.map(async (boardNumber) => ({
              boardNumber,
              instances: await getBoardInstances(db, boardNumber),
            })),
          );
          ack({ success: true, data: { boards } });
        } catch (err) {
          log.error({ err, gameId }, "Failed to load round results");
          ack({ success: true, data: null });
        }
      },
    },
  );

  socket.on(SocketEvents.LEAVE_ROUND_RESULTS, (payload: unknown) => {
    const parsed = leaveSchema.safeParse(payload);
    if (!parsed.success) return;
    socket.leave(Rooms.roundResults(parsed.data.gameId));
  });
}
