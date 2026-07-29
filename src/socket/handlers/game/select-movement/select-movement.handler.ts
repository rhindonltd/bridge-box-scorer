import { Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";

import {
  getIndividualMovement,
  IndividualMovement,
  PairMovement,
  TeamMovement,
  getPairMovement,
  getTeamMovement,
} from "@/db/movements/queries/get-movement";

import { getDb as getIndividualDb } from "@/db/games/individual";
import { getDb as getPairsDb } from "@/db/games/pairs";

import {
  boards as individualBoards,
  NewBoard as NewIndividualBoard,
} from "@/db/games/individual/tables/boards";
import {
  assignments as individualAssignments,
  Assignment as IndividualAssignment,
} from "@/db/games/individual/tables/assignments";

import {
  boards as pairBoards,
  NewBoard as NewPairBoard,
} from "@/db/games/pairs/tables/boards";
import {
  assignments as pairAssignments,
  Assignment as PairAssignment,
} from "@/db/games/pairs/tables/assignments";

import { assertDirector } from "@/socket/middleware/director-auth";

/**
 * Individual movement handler — bulk inserts inside a single transaction.
 */
async function handleIndividualMovement(
  movement: IndividualMovement[],
  gameId: string,
) {
  const boardRows: NewIndividualBoard[] = [];
  const assignmentRows: IndividualAssignment[] = [];

  for (const m of movement) {
    for (const r of m.rounds) {
      for (
        let boardNumber = r.boardStart;
        boardNumber <= r.boardEnd;
        boardNumber++
      ) {
        boardRows.push({
          roundNumber: r.roundNumber,
          tableNumber: m.tableNumber,
          boardNumber,
          n: r.n,
          s: r.s,
          e: r.e,
          w: r.w,
          status: "NOT_PLAYED",
        });
      }

      if (r.roundNumber === 1) {
        const seats = [
          { position: "N", movementId: r.n },
          { position: "S", movementId: r.s },
          { position: "E", movementId: r.e },
          { position: "W", movementId: r.w },
        ] as const;

        for (const { position, movementId } of seats) {
          assignmentRows.push({
            id: movementId,
            initialSeat: `${m.tableNumber}${position}` as IndividualAssignment["initialSeat"],
          });
        }
      }
    }
  }

  const db = await getIndividualDb(gameId);
  await db.transaction(async (tx) => {
    await tx.insert(individualBoards).values(boardRows);
    if (assignmentRows.length > 0) {
      await tx.insert(individualAssignments).values(assignmentRows);
    }
  });
}

/**
 * Pair + Team movement handler — bulk inserts inside a single transaction.
 */
async function handlePairLikeMovement(
  movement: PairMovement[] | TeamMovement[],
  gameId: string,
) {
  const boardRows: NewPairBoard[] = [];
  const assignmentRows: PairAssignment[] = [];

  for (const m of movement) {
    for (const r of m.rounds) {
      for (
        let boardNumber = r.boardStart;
        boardNumber <= r.boardEnd;
        boardNumber++
      ) {
        boardRows.push({
          roundNumber: r.roundNumber,
          tableNumber: m.tableNumber,
          boardNumber,
          ns: r.ns,
          ew: r.ew,
          status: "NOT_PLAYED",
        });
      }

      if (r.roundNumber === 1) {
        const seats = [
          { position: "NS", movementId: r.ns },
          { position: "EW", movementId: r.ew },
        ] as const;

        for (const { position, movementId } of seats) {
          assignmentRows.push({
            id: movementId,
            initialSeat: `${m.tableNumber}${position}` as PairAssignment["initialSeat"],
          });
        }
      }
    }
  }

  const db = await getPairsDb(gameId);
  await db.transaction(async (tx) => {
    await tx.insert(pairBoards).values(boardRows);
    if (assignmentRows.length > 0) {
      await tx.insert(pairAssignments).values(assignmentRows);
    }
  });
}

/**
 * Socket handler
 */
export function registerSelectMovementHandler(socket: Socket) {
  socket.on(
    SocketEvents.SELECT_MOVEMENT,
    async (
      {
        gameId,
        type,
        id,
      }: {
        gameId: string;
        type: string;
        id: number;
      },
      cb,
    ) => {
      if (!assertDirector(socket, cb)) return;

      try {
        if (type === "INDIVIDUAL") {
          await handleIndividualMovement(
            await getIndividualMovement(id),
            gameId,
          );
        } else if (type === "PAIRS") {
          await handlePairLikeMovement(await getPairMovement(id), gameId);
        } else {
          await handlePairLikeMovement(await getTeamMovement(id), gameId);
        }

        cb?.({ success: true });
      } catch (err) {
        console.error(err);
        cb?.({ success: false });
      }
    },
  );
}
