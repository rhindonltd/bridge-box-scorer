import { Server, Socket } from "socket.io";
import { eq, and } from "drizzle-orm";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { getDb as getPairsDb } from "@/db/games/pairs";
import { getDb as getIndividualDb } from "@/db/games/individual";
import { boards as pairsBoards } from "@/db/games/pairs/tables/boards";
import { boards as individualBoards } from "@/db/games/individual/tables/boards";

/**
 * In-memory store for pending submissions.
 * Key: `${gameId}:${tableNumber}:${roundNumber}`
 */
interface PendingSubmission {
  boardNumber: number;
  result: string;
}

interface TablePending {
  ns: PendingSubmission | null;
  ew: PendingSubmission | null;
}

const pendingSubmissions = new Map<string, TablePending>();

function getPendingKey(gameId: string, tableNumber: number, roundNumber: number): string {
  return `${gameId}:${tableNumber}:${roundNumber}`;
}

function getOrCreatePending(key: string): TablePending {
  if (!pendingSubmissions.has(key)) {
    pendingSubmissions.set(key, { ns: null, ew: null });
  }
  return pendingSubmissions.get(key)!;
}

export function registerSubmitResultHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.SUBMIT_RESULT,
    async (
      {
        gameId,
        gameType,
        seat,
        roundNumber,
        tableNumber,
        boardNumber,
        result,
      }: {
        gameId: string;
        gameType: string;
        seat: string;
        roundNumber: number;
        tableNumber: number;
        boardNumber: number;
        result: string;
      },
      cb,
    ) => {
      try {
        // Determine which side
        let isNS: boolean;
        if (gameType === "INDIVIDUAL") {
          const direction = seat.slice(-1);
          isNS = direction === "N" || direction === "S";
        } else {
          isNS = seat.endsWith("NS");
        }

        // Store pending submission
        const key = getPendingKey(gameId, tableNumber, roundNumber);
        const pending = getOrCreatePending(key);

        if (isNS) {
          pending.ns = { boardNumber, result };
        } else {
          pending.ew = { boardNumber, result };
        }

        cb?.({ success: true });

        // Check if both sides have submitted
        if (!pending.ns || !pending.ew) return;

        // Compare board number AND result
        if (pending.ns.boardNumber === pending.ew.boardNumber && pending.ns.result === pending.ew.result) {
          // Match — confirm
          const confirmedBoardNumber = pending.ns.boardNumber;
          const confirmedResult = pending.ns.result;

          // Clear pending for this board
          pendingSubmissions.delete(key);

          // Write to database
          if (gameType === "INDIVIDUAL") {
            const db = await getIndividualDb(gameId);
            await db
              .update(individualBoards)
              .set({ confirmedResult: confirmedResult as any, status: "CONFIRMED" })
              .where(
                and(
                  eq(individualBoards.roundNumber, roundNumber),
                  eq(individualBoards.tableNumber, tableNumber),
                  eq(individualBoards.boardNumber, confirmedBoardNumber),
                ),
              );
          } else {
            const db = await getPairsDb(gameId);
            await db
              .update(pairsBoards)
              .set({ confirmedResult: confirmedResult as any, status: "CONFIRMED" })
              .where(
                and(
                  eq(pairsBoards.roundNumber, roundNumber),
                  eq(pairsBoards.tableNumber, tableNumber),
                  eq(pairsBoards.boardNumber, confirmedBoardNumber),
                ),
              );
          }

          io.to(Rooms.game(gameId)).emit(SocketEvents.BOARD_CONFIRMED, {
            gameId,
            roundNumber,
            tableNumber,
            boardNumber: confirmedBoardNumber,
            result: confirmedResult,
          });

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
            nsBoardNumber: pending.ns.boardNumber,
            nsResult: pending.ns.result,
            ewBoardNumber: pending.ew.boardNumber,
            ewResult: pending.ew.result,
          });
        }
      } catch (err) {
        console.error("Submit result error:", err);
        cb?.({ success: false, error: "Failed to submit result" });
      }
    },
  );
}
