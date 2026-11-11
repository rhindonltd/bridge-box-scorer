import { Server, Socket } from "socket.io";
import { z } from "zod";

import { SocketEvents } from "@/socket/socket-events";
import { assertPlayer } from "@/socket/middleware/participant-auth";
import { getDb } from "@/db/games";
import { getBoardStatus } from "@/db/games/queries/get-board-status";
import { deleteSideSubmission } from "@/db/games/actions/delete-submissions";
import { parseSeat, PairSeat } from "@/model/participants";
import {
  registerHandler,
  HandlerError,
} from "@/socket/handlers/handler-wrapper";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  seat: z.string().min(1),
  token: z.string().optional(),
  roundNumber: z.number().int().positive(),
  tableNumber: z.number().int().positive(),
  boardNumber: z.number().int().positive(),
});

/**
 * WITHDRAW_SUBMISSION — a pair backs out of "waiting for confirmation" to
 * correct an entry they got wrong.
 *
 * Player-authed (the seat's own token). Deletes ONLY the caller's side of the
 * pending submission, and only while the board is not yet confirmed: once both
 * sides have agreed the result is final and the player is moved on by
 * BOARD_CONFIRMED instead. The other side's submission is left in place, so
 * when the corrected entry arrives it reconciles against it as normal.
 */
export function registerWithdrawSubmissionHandler(socket: Socket, io: Server) {
  registerHandler(socket, io, SocketEvents.WITHDRAW_SUBMISSION, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      const { gameId, seat, token, roundNumber, tableNumber, boardNumber } =
        payload;

      if (!(await assertPlayer(gameId, seat, token, ack))) {
        return;
      }

      const { section, direction } = parseSeat(seat as PairSeat);
      const db = await getDb(gameId);
      if (!db) {
        throw new HandlerError("Game not found");
      }

      const status = await getBoardStatus(db, {
        section,
        roundNumber,
        tableNumber,
        boardNumber,
      });
      if (status === "CONFIRMED" || status === "OVERRIDDEN") {
        throw new HandlerError(
          "This board has already been confirmed; its result can't be changed here.",
        );
      }

      await deleteSideSubmission(
        gameId,
        section,
        tableNumber,
        roundNumber,
        direction,
      );
      ack({ success: true, data: undefined });
    },
  });
}
