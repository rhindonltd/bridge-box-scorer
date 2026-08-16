import { Server, Socket } from "socket.io";
import { eq, and } from "drizzle-orm";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { getDb as getPairsDb } from "@/db/games";
import { boards as pairsBoards } from "@/db/games/tables/boards";
import { BoardOutcome } from "@/model/score";
import { createBoardSubmission } from "@/db/games/actions/create-submission";
import { findBoardSubmissions } from "@/db/games/queries/find-submissions";
import { BoardSubmission } from "@/db/games/tables/submissions";
import { deleteBoardSubmissions } from "@/db/games/actions/delete-submissions";

export function registerSubmitResultHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.SUBMIT_RESULT,
    async (
      {
        gameId,
        seat,
        roundNumber,
        tableNumber,
        boardNumber,
        result,
      }: {
        gameId: string;
        seat: string;
        roundNumber: number;
        tableNumber: number;
        boardNumber: number;
        result: BoardOutcome;
      },
      cb,
    ) => {
      try {
        // Determine which side
        const isNS = seat.endsWith("NS");

        // Store board submission
        await createBoardSubmission(gameId, {
          roundNumber,
          tableNumber,
          boardNumber,
          side: isNS ? "NS" : "EW",
          result
        });

        cb?.({ success: true });

        // Check if both sides have submitted
        const boardSubmissions: BoardSubmission[] = await findBoardSubmissions(
          gameId,
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

          // Write to database
          const db = await getPairsDb(gameId);
          await db
            .update(pairsBoards)
            .set({
              confirmedResult: confirmedResult as BoardOutcome,
              status: "CONFIRMED",
            })
            .where(
              and(
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
          await deleteBoardSubmissions(gameId, tableNumber, roundNumber);

          io.to(Rooms.game(gameId)).emit(SocketEvents.BOARD_RESULT_UPDATED, {
            gameId,
            roundNumber,
            tableNumber,
            boardNumber: confirmedBoardNumber,
          });
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
