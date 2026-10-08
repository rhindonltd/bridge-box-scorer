import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import { BoardOutcome } from "@/model/score";
import { isAdjustedScore } from "@/model/adjusted-score";
import { cancelBoardResult } from "@/db/games/actions/set-board-result";
import { assertDirector } from "@/socket/middleware/director-auth";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { broadcastResultsChanged } from "./broadcast-results";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  boardNumber: z.number().int().positive(),
  roundNumber: z.number().int().min(1),
  tableNumber: z.number().int().min(1),
  // The artificial adjusted score (`A<ns>/<ew>`) the director assigns for the
  // cancelled copy — the fault split the TD decides (§3.3.2). Validated as an
  // adjusted score so a cancel can only ever carry an AVE-type outcome.
  result: z.string().refine(isAdjustedScore, {
    message: "A cancelled board must carry an adjusted score (A<ns>/<ew>)",
  }),
});

/**
 * Director-authed cancellation of a single board copy that could not be played
 * (fouled / mis-dealt / arrow-switched / out of time) — EBU White Book §3.3.2.
 * Writes the director's chosen artificial adjusted score and flips the row to
 * CANCELLED, then fans out recomputed leaderboard / traveller snapshots via the
 * shared occupancy-gated broadcaster so every viewer updates live. Mirrors
 * {@link import("./traveller-override.handler")} exactly except for the
 * CANCELLED status and the adjusted-score-only payload validation.
 */
export function registerCancelBoardHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, null>(
    socket,
    io,
    SocketEvents.CANCEL_BOARD_TRAVELLER,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack, log }) => {
        const { gameId, directorToken, boardNumber, roundNumber, tableNumber, result } =
          payload;

        // assertDirector acks its own Unauthorized failure via the guarded ack.
        if (!assertDirector(directorToken, gameId, ack)) return;

        const db = await getDb(gameId);
        if (!db) {
          throw new HandlerError("Game not found");
        }

        try {
          await cancelBoardResult(
            db,
            { roundNumber, tableNumber, boardNumber },
            result as BoardOutcome,
          );
        } catch (err) {
          log.error({ err, gameId, boardNumber }, "Failed to cancel board");
          throw new HandlerError("Failed to cancel board");
        }

        ack({ success: true, data: null });

        await broadcastResultsChanged(io, gameId, boardNumber);
      },
    },
  );
}
