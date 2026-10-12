import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { BoardOutcome } from "@/model/score";
import { overrideBoardResult } from "@/db/games/actions/set-board-result";
import {
  registerDirectorBoardRuling,
  directorRulingSchema,
} from "./director-board-ruling";

const payloadSchema = directorRulingSchema({
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
  registerDirectorBoardRuling(socket, io, {
    event: SocketEvents.OVERRIDE_RESULT_TRAVELLER,
    schema: payloadSchema,
    apply: (db, { roundNumber, tableNumber, boardNumber, result }) =>
      overrideBoardResult(
        db,
        { roundNumber, tableNumber, boardNumber },
        result as BoardOutcome,
      ),
    errorMessage: "Failed to override result",
  });
}
