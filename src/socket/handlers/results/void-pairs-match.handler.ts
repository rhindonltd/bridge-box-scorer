import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import { buildPairVoid } from "@/model/pairs-match-void";
import { voidPairsMatch } from "@/db/games/actions/set-board-result";
import { assertDirector } from "@/socket/middleware/director-auth";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { broadcastResultsChanged } from "./broadcast-results";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  // The board the director acted from (for the live traveller push); the void
  // applies to the whole table (round + table).
  boardNumber: z.number().int().positive(),
  roundNumber: z.number().int().min(1),
  tableNumber: z.number().int().min(1),
  // Why the match is void (§3.3.8/§3.3.9), relative to the acted row's seats:
  // OFFENDER_NS/OFFENDER_EW/BOTH/NEITHER → each pair's AVE+/AVE−/AVE blend.
  cause: z.enum(["OFFENDER_NS", "OFFENDER_EW", "BOTH", "NEITHER"]),
});

/**
 * Director-authed voiding of a whole SWISS-PAIRS match (EBU White Book §3.3.8 /
 * §3.3.9). Flips the acted table's board rows to VOID_PAIR with the chosen
 * `VOIDP:<cause>` token, so the Swiss-pairs VP scorer removes the match from the
 * field and credits each pair an AVE+/AVE−/AVE compensation, then fans out
 * recomputed snapshots. Mirrors the teams void handler.
 */
export function registerVoidPairsMatchHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, null>(
    socket,
    io,
    SocketEvents.VOID_PAIRS_MATCH_TRAVELLER,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack, log }) => {
        const { gameId, directorToken, boardNumber, roundNumber, tableNumber, cause } =
          payload;

        // assertDirector acks its own Unauthorized failure via the guarded ack.
        if (!assertDirector(directorToken, gameId, ack)) return;

        const db = await getDb(gameId);
        if (!db) {
          throw new HandlerError("Game not found");
        }

        try {
          await voidPairsMatch(
            db,
            { roundNumber, tableNumber },
            buildPairVoid(cause),
          );
        } catch (err) {
          log.error({ err, gameId, roundNumber, tableNumber }, "Failed to void pairs match");
          throw new HandlerError("Failed to void pairs match");
        }

        ack({ success: true, data: null });

        await broadcastResultsChanged(io, gameId, boardNumber);
      },
    },
  );
}
