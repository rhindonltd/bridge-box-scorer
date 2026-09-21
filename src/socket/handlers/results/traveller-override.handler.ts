import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import { BoardOutcome } from "@/model/score";
import { overrideBoardResult } from "@/db/games/actions/set-board-result";
import { assertDirector } from "@/socket/middleware/director-auth";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { broadcastResultsChanged } from "./broadcast-results";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  boardNumber: z.number().int().positive(),
  roundNumber: z.number().int().min(1),
  tableNumber: z.number().int().min(1),
  result: z.string().min(1),
});

/**
 * Director-authed override of a single board result. Writes the override to the
 * boards table, then fans out recomputed leaderboard / traveller snapshots via
 * the shared occupancy-gated broadcaster — so the director's own traveller view
 * and any other viewers update live without a refetch. Replaces the former HTTP
 * `/boards/[boardNumber]/override` route.
 */
export function registerTravellerOverrideHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, null>(
    socket,
    io,
    SocketEvents.OVERRIDE_RESULT_TRAVELLER,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack, log }) => {
        const {
          gameId,
          directorToken,
          boardNumber,
          roundNumber,
          tableNumber,
          result,
        } = payload;

        // assertDirector acks its own Unauthorized failure via the guarded ack.
        if (!assertDirector(directorToken, gameId, ack)) return;

        const db = await getDb(gameId);
        if (!db) {
          throw new HandlerError("Game not found");
        }

        try {
          await overrideBoardResult(
            db,
            { roundNumber, tableNumber, boardNumber },
            result as BoardOutcome,
          );
        } catch (err) {
          log.error({ err, gameId, boardNumber }, "Failed to override result");
          throw new HandlerError("Failed to override result");
        }

        ack({ success: true, data: null });

        await broadcastResultsChanged(io, gameId, boardNumber);
      },
    },
  );
}
