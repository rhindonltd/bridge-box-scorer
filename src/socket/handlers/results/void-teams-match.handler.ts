import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import { buildVoidMatch } from "@/model/teams-match-void";
import { voidTeamsMatch } from "@/db/games/actions/set-board-result";
import { assertDirector } from "@/socket/middleware/director-auth";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { broadcastResultsChanged } from "./broadcast-results";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  // The board the director acted from (used for the live traveller push); the
  // void itself applies to the whole room (round + table).
  boardNumber: z.number().int().positive(),
  roundNumber: z.number().int().min(1),
  tableNumber: z.number().int().min(1),
  // How the void is scored (§3.3.6.1 flat 40/60, or §3.3.9 half-split by
  // offender), expressed relative to the acted row's NS/EW seats.
  cause: z.enum([
    "SEATING_STANDARD",
    "SEATING_TD",
    "SHORT_OFFENDER_NS",
    "SHORT_OFFENDER_EW",
    "SHORT_BOTH",
    "SHORT_NEITHER",
  ]),
});

/**
 * Director-authed voiding of a whole TEAMS match (EBU White Book §3.3.6.1 /
 * §3.3.9). Flips the acted room's board rows to VOID_MATCH with the chosen
 * `VOID:<cause>` token, so the teams VP scorer credits each team a ruling VP
 * instead of a margin → VP, then fans out recomputed snapshots. Mirrors the
 * other director board-ruling handlers.
 */
export function registerVoidTeamsMatchHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, null>(
    socket,
    io,
    SocketEvents.VOID_TEAMS_MATCH_TRAVELLER,
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
          await voidTeamsMatch(
            db,
            { roundNumber, tableNumber },
            buildVoidMatch(cause),
          );
        } catch (err) {
          log.error({ err, gameId, roundNumber, tableNumber }, "Failed to void match");
          throw new HandlerError("Failed to void match");
        }

        ack({ success: true, data: null });

        await broadcastResultsChanged(io, gameId, boardNumber);
      },
    },
  );
}
