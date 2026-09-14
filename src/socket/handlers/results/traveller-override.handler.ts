import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import { BoardOutcome } from "@/model/score";
import { overrideBoardResult } from "@/db/games/actions/set-board-result";
import { assertDirector } from "@/socket/middleware/director-auth";
import { SocketResponse } from "@/socket/socket-response";
import { logger } from "@/lib/log";
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
  socket.on(
    SocketEvents.OVERRIDE_RESULT_TRAVELLER,
    async (
      payload: unknown,
      cb?: (response: SocketResponse<null>) => void,
    ) => {
      const parsed = payloadSchema.safeParse(payload);
      if (!parsed.success) {
        cb?.({ success: false, error: "Invalid payload" });
        return;
      }

      const {
        gameId,
        directorToken,
        boardNumber,
        roundNumber,
        tableNumber,
        result,
      } = parsed.data;

      if (!assertDirector(directorToken, gameId, cb)) return;

      try {
        const db = await getDb(gameId);
        if (!db) {
          cb?.({ success: false, error: "Game not found" });
          return;
        }

        await overrideBoardResult(
          db,
          { roundNumber, tableNumber, boardNumber },
          result as BoardOutcome,
        );

        cb?.({ success: true, data: null });

        await broadcastResultsChanged(io, gameId, boardNumber);
      } catch (err) {
        logger.error(
          { err, gameId, boardNumber },
          "Failed to override result",
        );
        cb?.({ success: false, error: "Failed to override result" });
      }
    },
  );
}
