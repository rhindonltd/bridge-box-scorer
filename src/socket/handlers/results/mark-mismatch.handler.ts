import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import { buildMismatch } from "@/model/swiss-mismatch";
import { markMismatch } from "@/db/games/actions/set-board-result";
import { assertDirector } from "@/socket/middleware/director-auth";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { broadcastResultsChanged } from "./broadcast-results";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  // The board the director acted from (for the live traveller push); the
  // mismatch applies to the whole table/room (round + table).
  boardNumber: z.number().int().positive(),
  roundNumber: z.number().int().min(1),
  tableNumber: z.number().int().min(1),
  // The §3.5 mismatch ruling, relative to the acted row's seats (NS = this
  // table / home team, EW = the opponents): which SIDE is mismatched, whether
  // the actual opponent out-scored (HIGHER) or trailed (LOWER) the correct one,
  // and whose FAULT it was.
  side: z.enum(["NS", "EW"]),
  direction: z.enum(["HIGHER", "LOWER"]),
  fault: z.enum(["OWN", "NOT"]),
});

/**
 * Director-authed §3.5 Swiss MISMATCH ruling. Flips the acted table's board
 * rows to MISMATCH with the chosen `MM:<side>:<direction>:<fault>` token. The
 * boards remain real and in the field — the Swiss VP scorers (pairs and teams)
 * read the token and recompute ONLY the mismatched side's round VP via the
 * §3.5.2 adjustment — then fan out recomputed snapshots. Mirrors the void
 * handlers.
 */
export function registerMarkMismatchHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, null>(
    socket,
    io,
    SocketEvents.MISMATCH_TRAVELLER,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack, log }) => {
        const {
          gameId,
          directorToken,
          boardNumber,
          roundNumber,
          tableNumber,
          side,
          direction,
          fault,
        } = payload;

        // assertDirector acks its own Unauthorized failure via the guarded ack.
        if (!assertDirector(directorToken, gameId, ack)) return;

        const db = await getDb(gameId);
        if (!db) {
          throw new HandlerError("Game not found");
        }

        try {
          await markMismatch(
            db,
            // boardNumber disambiguates a triple: a triple home table hosts two
            // separate 10-VP comparisons, so the acted board picks the right one.
            { roundNumber, tableNumber, boardNumber },
            buildMismatch({ side, direction, fault }),
          );
        } catch (err) {
          log.error(
            { err, gameId, roundNumber, tableNumber },
            "Failed to mark mismatch",
          );
          throw new HandlerError("Failed to mark mismatch");
        }

        ack({ success: true, data: null });

        await broadcastResultsChanged(io, gameId, boardNumber);
      },
    },
  );
}
