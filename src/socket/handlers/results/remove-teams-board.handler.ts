import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import { buildRemovedTeamsBoard } from "@/model/teams-removed-board";
import { removeTeamsBoardResult } from "@/db/games/actions/set-board-result";
import { assertDirector } from "@/socket/middleware/director-auth";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { broadcastResultsChanged } from "./broadcast-results";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  boardNumber: z.number().int().positive(),
  roundNumber: z.number().int().min(1),
  tableNumber: z.number().int().min(1),
  // Which side (if any) was at fault for the removed board (§3.3.7), expressed
  // relative to the selected row's NS/EW seats. Drives the ±3 IMP indemnity:
  // EW_FAULT → NS +3; NS_FAULT → NS −3; NEITHER/BOTH → 0 net (see
  // model/teams-removed-board.ts for the both-vs-neither limitation).
  fault: z.enum(["EW_FAULT", "NS_FAULT", "BOTH_FAULT", "NEITHER_FAULT"]),
});

/**
 * Director-authed removal of a board from a TEAMS match that could not be
 * played (EBU White Book §3.3.7). Writes the removal fault token and flips the
 * row to REMOVED_TEAMS, so the teams IMP scorers award the ±3 IMP indemnity for
 * the board, then fans out recomputed snapshots via the shared occupancy-gated
 * broadcaster. Mirrors the cancel-board handler.
 */
export function registerRemoveTeamsBoardHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, null>(
    socket,
    io,
    SocketEvents.REMOVE_TEAMS_BOARD_TRAVELLER,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack, log }) => {
        const { gameId, directorToken, boardNumber, roundNumber, tableNumber, fault } =
          payload;

        // assertDirector acks its own Unauthorized failure via the guarded ack.
        if (!assertDirector(directorToken, gameId, ack)) return;

        const db = await getDb(gameId);
        if (!db) {
          throw new HandlerError("Game not found");
        }

        try {
          await removeTeamsBoardResult(
            db,
            { roundNumber, tableNumber, boardNumber },
            buildRemovedTeamsBoard(fault),
          );
        } catch (err) {
          log.error({ err, gameId, boardNumber }, "Failed to remove teams board");
          throw new HandlerError("Failed to remove teams board");
        }

        ack({ success: true, data: null });

        await broadcastResultsChanged(io, gameId, boardNumber);
      },
    },
  );
}
