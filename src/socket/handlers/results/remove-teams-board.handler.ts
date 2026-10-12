import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { buildRemovedTeamsBoard } from "@/model/teams-removed-board";
import { removeTeamsBoardResult } from "@/db/games/actions/set-board-result";
import {
  registerDirectorBoardRuling,
  directorRulingSchema,
} from "./director-board-ruling";

const payloadSchema = directorRulingSchema({
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
  registerDirectorBoardRuling(socket, io, {
    event: SocketEvents.REMOVE_TEAMS_BOARD_TRAVELLER,
    schema: payloadSchema,
    apply: (db, { roundNumber, tableNumber, boardNumber, fault }) =>
      removeTeamsBoardResult(
        db,
        { roundNumber, tableNumber, boardNumber },
        buildRemovedTeamsBoard(fault),
      ),
    errorMessage: "Failed to remove teams board",
  });
}
