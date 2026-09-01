import "server-only";

import {
  PairMovement,
  TeamMovement,
} from "@/db/movements/queries/get-movement";

import { getDb } from "@/db/games";

import { boards, NewBoard } from "@/db/games/tables/boards";
import { assignments, Assignment } from "@/db/games/tables/assignments";
import { Tables } from "@/model/movement";

/**
 * Materialize a pair-like movement (Pairs or Teams) into the per-game database:
 * every round becomes board rows, and round 1 becomes the seat assignments.
 * All inserts run inside a single transaction.
 *
 * This is deferred until the game is started (see the start-game handler); it is
 * intentionally free of validation and assumes the caller has already confirmed
 * the movement/seating is valid.
 */
export async function materializePairLikeMovement(
  movement: PairMovement[] | TeamMovement[],
  gameId: string,
) {
  const boardRows: NewBoard[] = [];
  const assignmentRows: Assignment[] = [];

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
              `${m.tableNumber}${position}` as Assignment["initialSeat"],
          });
        }
      }
    }
  }

  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  db.transaction((tx) => {
    tx.insert(boards).values(boardRows).run();
    if (assignmentRows.length > 0) {
      tx.insert(assignments).values(assignmentRows).run();
    }
  });
}

/**
 * Convert the generateMitchell output (Tables<"PAIR">) into the PairMovement[]
 * shape expected by materializePairLikeMovement.
 */
export function mitchellToPairMovement(
  tables: Tables<"PAIR">,
): PairMovement[] {
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
