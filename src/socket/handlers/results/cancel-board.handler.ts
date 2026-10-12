import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { BoardOutcome } from "@/model/score";
import { isAdjustedScore } from "@/model/adjusted-score";
import { cancelBoardResult } from "@/db/games/actions/set-board-result";
import {
  registerDirectorBoardRuling,
  directorRulingSchema,
} from "./director-board-ruling";

const payloadSchema = directorRulingSchema({
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
  registerDirectorBoardRuling(socket, io, {
    event: SocketEvents.CANCEL_BOARD_TRAVELLER,
    schema: payloadSchema,
    apply: (db, { roundNumber, tableNumber, boardNumber, result }) =>
      cancelBoardResult(
        db,
        { roundNumber, tableNumber, boardNumber },
        result as BoardOutcome,
      ),
    errorMessage: "Failed to cancel board",
  });
}
