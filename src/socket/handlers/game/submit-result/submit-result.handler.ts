import { Server, Socket } from "socket.io";
import { eq, and } from "drizzle-orm";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { getDb as getPairsDb } from "@/db/games/pairs";
import { getDb as getIndividualDb } from "@/db/games/individual";
import { boards as pairsBoards } from "@/db/games/pairs/tables/boards";
import { boards as individualBoards } from "@/db/games/individual/tables/boards";

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
        if (gameType === "INDIVIDUAL") {
          await handleIndividualSubmission(
            io, gameId, seat, roundNumber, tableNumber, boardNumber, result,
          );
        } else {
          await handlePairSubmission(
            io, gameId, seat, roundNumber, tableNumber, boardNumber, result,
          );
        }

        cb?.({ success: true });
      } catch (err) {
        console.error("Submit result error:", err);
        cb?.({ success: false, error: "Failed to submit result" });
      }
    },
  );
}

async function handlePairSubmission(
  io: Server,
  gameId: string,
  seat: string,
  roundNumber: number,
  tableNumber: number,
  boardNumber: number,
  result: string,
) {
  const db = await getPairsDb(gameId);
  const isNS = seat.endsWith("NS");

  // Save the result to the appropriate column
  const updateData = isNS
    ? { nsResult: result as any }
    : { ewResult: result as any };

  await db
    .update(pairsBoards)
    .set(updateData)
    .where(
      and(
        eq(pairsBoards.roundNumber, roundNumber),
        eq(pairsBoards.tableNumber, tableNumber),
        eq(pairsBoards.boardNumber, boardNumber),
      ),
    );

  // Check if both sides have submitted
  const board = await db
    .select()
    .from(pairsBoards)
    .where(
      and(
        eq(pairsBoards.roundNumber, roundNumber),
        eq(pairsBoards.tableNumber, tableNumber),
        eq(pairsBoards.boardNumber, boardNumber),
      ),
    )
    .get();

  if (!board || !board.nsResult || !board.ewResult) return;

  // Both sides have submitted — compare
  if (board.nsResult === board.ewResult) {
    // Match — confirm the board
    await db
      .update(pairsBoards)
      .set({ status: "CONFIRMED" })
      .where(
        and(
          eq(pairsBoards.roundNumber, roundNumber),
          eq(pairsBoards.tableNumber, tableNumber),
          eq(pairsBoards.boardNumber, boardNumber),
        ),
      );

    io.to(Rooms.game(gameId)).emit(SocketEvents.BOARD_CONFIRMED, {
      gameId,
      roundNumber,
      tableNumber,
      boardNumber,
      result: board.nsResult,
    });

    io.to(Rooms.game(gameId)).emit(SocketEvents.BOARD_RESULT_UPDATED, {
      gameId,
      roundNumber,
      tableNumber,
      boardNumber,
    });
  } else {
    // Mismatch — notify both sides but keep results stored
    // When the wrong side re-enters, normal comparison will run against the other side's existing result
    io.to(Rooms.game(gameId)).emit(SocketEvents.BOARD_MISMATCH, {
      gameId,
      roundNumber,
      tableNumber,
      boardNumber,
      nsResult: board.nsResult,
      ewResult: board.ewResult,
    });
  }
}

async function handleIndividualSubmission(
  io: Server,
  gameId: string,
  seat: string,
  roundNumber: number,
  tableNumber: number,
  boardNumber: number,
  result: string,
) {
  const db = await getIndividualDb(gameId);

  // Determine which side: N/S are one side, E/W are the other
  const direction = seat.slice(-1);
  const isNS = direction === "N" || direction === "S";

  // Use nResult for NS-side submission, eResult for EW-side submission
  const updateData = isNS
    ? { nResult: result as any }
    : { eResult: result as any };

  await db
    .update(individualBoards)
    .set(updateData)
    .where(
      and(
        eq(individualBoards.roundNumber, roundNumber),
        eq(individualBoards.tableNumber, tableNumber),
        eq(individualBoards.boardNumber, boardNumber),
      ),
    );

  // Check if both sides have submitted
  const board = await db
    .select()
    .from(individualBoards)
    .where(
      and(
        eq(individualBoards.roundNumber, roundNumber),
        eq(individualBoards.tableNumber, tableNumber),
        eq(individualBoards.boardNumber, boardNumber),
      ),
    )
    .get();

  if (!board || !board.nResult || !board.eResult) return;

  // Both sides have submitted — compare
  if (board.nResult === board.eResult) {
    // Match — confirm
    await db
      .update(individualBoards)
      .set({ status: "CONFIRMED" })
      .where(
        and(
          eq(individualBoards.roundNumber, roundNumber),
          eq(individualBoards.tableNumber, tableNumber),
          eq(individualBoards.boardNumber, boardNumber),
        ),
      );

    io.to(Rooms.game(gameId)).emit(SocketEvents.BOARD_CONFIRMED, {
      gameId,
      roundNumber,
      tableNumber,
      boardNumber,
      result: board.nResult,
    });

    io.to(Rooms.game(gameId)).emit(SocketEvents.BOARD_RESULT_UPDATED, {
      gameId,
      roundNumber,
      tableNumber,
      boardNumber,
    });
  } else {
    // Mismatch — notify both sides but keep results stored
    // When the wrong side re-enters, normal comparison will run against the other side's existing result
    io.to(Rooms.game(gameId)).emit(SocketEvents.BOARD_MISMATCH, {
      gameId,
      roundNumber,
      tableNumber,
      boardNumber,
      nsResult: board.nResult,
      ewResult: board.eResult,
    });
  }
}
