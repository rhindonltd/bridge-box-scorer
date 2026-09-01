import "server-only";

import { getDb } from "@/db/games";

import { boards, NewBoard } from "@/db/games/tables/boards";
import { assignments, Assignment } from "@/db/games/tables/assignments";
import { Tables } from "@/model/movement";

/**
 * A round in a movement ready to be materialized. Mirrors the DB round spec
 * but adds an optional `sitOut` flag: when true, this (table, round) is the
 * dormant position for a one-pair-short session — its boards are written with
 * status SIT_OUT (not played anywhere at that table that round) and the pair
 * scheduled there sits the round out.
 */
export interface MaterializableRound {
  roundNumber: number;
  ns: string;
  ew: string;
  boardStart: number;
  boardEnd: number;
  sitOut?: boolean;
}

export interface MaterializableTable {
  tableNumber: number;
  rounds: MaterializableRound[];
}

export type MaterializableMovement = MaterializableTable[];

/**
 * Materialize a pair-like movement (Pairs or Teams) into the per-game database:
 * every round becomes board rows, and round 1 becomes the seat assignments.
 * All inserts run inside a single transaction.
 *
 * Rounds flagged `sitOut` still produce board rows (keeping their real board
 * numbers and table) but with status SIT_OUT, so the sitting-out pair's screen
 * can show the table while those boards are never played, scored, or submitted.
 *
 * This is deferred until the game is started (see the start-game handler); it is
 * intentionally free of validation and assumes the caller has already confirmed
 * the movement/seating is valid.
 */
export async function materializePairLikeMovement(
  movement: MaterializableMovement,
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
          status: r.sitOut ? "SIT_OUT" : "NOT_PLAYED",
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
 * Convert the generateMitchell output (Tables<"PAIR">) into the
 * MaterializableMovement shape.
 */
export function mitchellToPairMovement(
  tables: Tables<"PAIR">,
): MaterializableMovement {
  return tables.tables.map((table) => ({
    tableNumber: table.table,
    rounds: table.rounds.map((round) => ({
      roundNumber: round.round,
      ns: round.participants.nsId,
      ew: round.participants.ewId,
      boardStart: round.boards[0],
      boardEnd: round.boards[round.boards.length - 1],
    })),
  }));
}
