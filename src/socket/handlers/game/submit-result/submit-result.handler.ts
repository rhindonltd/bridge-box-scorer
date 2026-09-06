import { Server, Socket } from "socket.io";
import { eq, and } from "drizzle-orm";
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

export function registerSubmitResultHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.SUBMIT_RESULT,
    async (
      {
        gameId,
        seat,
        token,
        roundNumber,
        tableNumber,
        boardNumber,
        result,
      }: {
        gameId: string;
        seat: string;
        token: string;
        roundNumber: number;
        tableNumber: number;
        boardNumber: number;
        result: BoardOutcome;
      },
      cb,
    ) => {
      try {
        // Verify the submission carries the seat's player token before any
        // read or write. Rejects (with a warning log) if it came from someone
        // who does not hold this seat.
        if (!(await assertPlayer(gameId, seat, token, cb))) {
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
            cb?.({ success: false, error: "This board is a sit-out" });
            return;
          }
        }

        // Store board submission
        await createBoardSubmission(gameId, {
          section,
          roundNumber,
          tableNumber,
          boardNumber,
          side: isNS ? "NS" : "EW",
          result,
        });

        cb?.({ success: true });

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
          await deleteBoardSubmissions(gameId, section, tableNumber, roundNumber);

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
      } catch (err) {
        console.error("Submit result error:", err);
        cb?.({ success: false, error: "Failed to submit result" });
      }
    },
  );
}
