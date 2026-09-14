import { Server, Socket } from "socket.io";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { getDb } from "@/db/games";
import { boards as pairsBoards } from "@/db/games/tables/boards";
import { BoardOutcome } from "@/model/score";
import { parseSeat, PairSeat } from "@/model/participants";
import { createBoardSubmission } from "@/db/games/actions/create-submission";
import { findBoardSubmissions } from "@/db/games/queries/find-submissions";
import { BoardSubmission } from "@/db/games/tables/submissions";
import { deleteBoardSubmissions } from "@/db/games/actions/delete-submissions";
import { broadcastResultsChanged } from "@/socket/handlers/results/broadcast-results";
import { assertPlayer } from "@/socket/middleware/participant-auth";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  seat: z.string().min(1),
  token: z.string().optional(),
  roundNumber: z.number().int().positive(),
  tableNumber: z.number().int().positive(),
  boardNumber: z.number().int().positive(),
  // The board result is a domain-encoded string (validated downstream by the
  // scoring model); accept it as an opaque outcome here.
  result: z.custom<BoardOutcome>(),
});

export function registerSubmitResultHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>>(
    socket,
    io,
    SocketEvents.SUBMIT_RESULT,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack, log }) => {
        const {
          gameId,
          seat,
          token,
          roundNumber,
          tableNumber,
          boardNumber,
          result,
        } = payload;

        // Verify the submission carries the seat's player token before any read
        // or write. assertPlayer acks its own Unauthorized failure via the
        // guarded ack, then we stop.
        if (!(await assertPlayer(gameId, seat, token, ack))) {
          return;
        }

        // The seat is section-qualified (e.g. "A1NS"); its section scopes every
        // board / submission lookup so sections sharing a table number don't
        // collide.
        const { section, direction } = parseSeat(seat as PairSeat);
        const isNS = direction === "NS";

        // Defensively reject submissions against a sit-out board: nobody plays
        // that board at that table this round.
        const db = await getDb(gameId);
        if (db) {
          const targetBoard = await db
            .select({ status: pairsBoards.status })
            .from(pairsBoards)
            .where(
              and(
                eq(pairsBoards.section, section),
                eq(pairsBoards.roundNumber, roundNumber),
                eq(pairsBoards.tableNumber, tableNumber),
                eq(pairsBoards.boardNumber, boardNumber),
              ),
            )
            .get();

          if (targetBoard?.status === "SIT_OUT") {
            throw new HandlerError("This board is a sit-out");
          }
        }

        // Store the board submission. A failure here is in the submitter's own
        // path (before we ack success), so surface it as a submit failure.
        try {
          await createBoardSubmission(gameId, {
            section,
            roundNumber,
            tableNumber,
            boardNumber,
            side: isNS ? "NS" : "EW",
            result,
          });
        } catch (err) {
          log.error({ err, gameId, seat }, "Failed to store board submission");
          throw new HandlerError("Failed to submit result");
        }

        // The submitter's own action succeeded — ack now. Everything below is a
        // downstream side-effect (confirm/mismatch/broadcast); the wrapper's
        // single-ack guard means a failure there is logged, never re-acked.
        ack({ success: true, data: undefined });

        // Check if both sides have submitted
        const boardSubmissions: BoardSubmission[] = await findBoardSubmissions(
          gameId,
          section,
          tableNumber,
          roundNumber,
        );

        if (boardSubmissions.length != 2) {
          return;
        }

        const ns = boardSubmissions.find((s) => s.side === "NS");
        const ew = boardSubmissions.find((s) => s.side === "EW");

        if (!ns || !ew) {
          return;
        }

        const matches =
          ns.boardNumber === ew.boardNumber && ns.result === ew.result;

        if (matches) {
          // Match — confirm
          const confirmedBoardNumber = boardSubmissions[0].boardNumber;
          const confirmedResult = boardSubmissions[0].result;

          // Write to database (reuse the db resolved above).
          if (!db) {
            throw new Error("Game db does not exist");
          }

          await db
            .update(pairsBoards)
            .set({
              confirmedResult: confirmedResult as BoardOutcome,
              status: "CONFIRMED",
            })
            .where(
              and(
                eq(pairsBoards.section, section),
                eq(pairsBoards.roundNumber, roundNumber),
                eq(pairsBoards.tableNumber, tableNumber),
                eq(pairsBoards.boardNumber, confirmedBoardNumber),
              ),
            );

          io.to(Rooms.game(gameId)).emit(SocketEvents.BOARD_CONFIRMED, {
            gameId,
            roundNumber,
            tableNumber,
            boardNumber: confirmedBoardNumber,
            result: confirmedResult,
          });

          // Clear pending for this board
          await deleteBoardSubmissions(
            gameId,
            section,
            tableNumber,
            roundNumber,
          );

          io.to(Rooms.game(gameId)).emit(SocketEvents.BOARD_RESULT_UPDATED, {
            gameId,
            roundNumber,
            tableNumber,
            boardNumber: confirmedBoardNumber,
          });

          // Push recomputed leaderboard / traveller snapshots to any clients
          // currently viewing them (occupancy-gated inside the broadcaster).
          await broadcastResultsChanged(io, gameId, confirmedBoardNumber);
        } else {
          // Mismatch — keep pending, notify both sides
          io.to(Rooms.game(gameId)).emit(SocketEvents.BOARD_MISMATCH, {
            gameId,
            roundNumber,
            tableNumber,
            nsBoardNumber: ns.boardNumber,
            nsResult: ns.result,
            ewBoardNumber: ew.boardNumber,
            ewResult: ew.result,
          });
        }
      },
    },
  );
}
