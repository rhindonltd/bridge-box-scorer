import type { Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";

import {
  PairMovement,
  TeamMovement,
  getPairMovement,
  getTeamMovement,
} from "@/db/movements/queries/get-movement";

import { getDb as getPairsDb } from "@/db/games";

import {
  boards as pairBoards,
  NewBoard as NewPairBoard,
} from "@/db/games/tables/boards";
import {
  assignments as pairAssignments,
  Assignment as PairAssignment,
} from "@/db/games/tables/assignments";

import { assertDirector } from "@/socket/middleware/director-auth";
import { Tables } from "@/model/movement";
import { generateMitchell } from "@/movement/mitchell/mitchell";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";

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
            initialSeat:
              `${m.tableNumber}${position}` as PairAssignment["initialSeat"],
          });
        }
      }
    }
  }

  const db = await getPairsDb(gameId);
  db.transaction((tx) => {
    tx.insert(pairBoards).values(boardRows).run();
    if (assignmentRows.length > 0) {
      tx.insert(pairAssignments).values(assignmentRows).run();
    }
  });
}

/**
 * Convert the generateMitchell output into the PairMovement[] format
 * expected by handlePairLikeMovement.
 */
function mitchellToPairMovement(tables: Tables<"PAIR">): PairMovement[] {
  return tables.tables.map((table) => ({
    id: 0,
    movementId: 0,
    tableNumber: table.table,
    rounds: table.rounds.map((round) => ({
      id: 0,
      tableId: 0,
      roundNumber: round.round,
      ns: round.participants.nsId,
      ew: round.participants.ewId,
      boardStart: round.boards[0],
      boardEnd: round.boards[round.boards.length - 1],
    })),
  }));
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
        mitchell,
        directorToken,
      }: {
        gameId: string;
        type: string;
        id?: number;
        mitchell?: MitchellMovementSpec;
        directorToken: string;
      },
      cb,
    ) => {
      if (!assertDirector(directorToken, gameId, cb)) return;

      try {
        if (mitchell) {
          const generated = generateMitchell(mitchell);
          const pairMovement = mitchellToPairMovement(generated);
          await handlePairLikeMovement(pairMovement, gameId);
        } else if (id != null) {
          if (type === "PAIRS") {
            await handlePairLikeMovement(await getPairMovement(id), gameId);
          } else {
            await handlePairLikeMovement(await getTeamMovement(id), gameId);
          }
        } else {
          cb?.({ success: false, error: "No movement specified" });
          return;
        }

        cb?.({ success: true });
      } catch (err) {
        console.error(err);
        cb?.({ success: false });
      }
    },
  );
}
