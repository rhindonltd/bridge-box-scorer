import "server-only";

import { getDb } from "@/db/games";

import { boards, NewBoard } from "@/db/games/tables/boards";
import { assignments, Assignment } from "@/db/games/tables/assignments";
import { Tables } from "@/model/movement";
import { SectionLetter, seatFor } from "@/model/participants";

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
  /**
   * Physical duplicate copy of the board set (Web Mitchell only). Optional in
   * this in-memory shape; every persisted board row still gets a definite copy
   * because the boards.copy column defaults to "A".
   */
  boardCopy?: string;
}

export interface MaterializableTable {
  tableNumber: number;
  rounds: MaterializableRound[];
}

export type MaterializableMovement = MaterializableTable[];

/**
 * Build the board and assignment rows for a single section's movement. Every
 * round becomes board rows (tagged with the section), and round 1 becomes the
 * section-qualified seat assignments.
 *
 * Rounds flagged `sitOut` still produce board rows (keeping their real board
 * numbers and table) but with status SIT_OUT, so the sitting-out pair's screen
 * can show the table while those boards are never played, scored, or submitted.
 *
 * Exposed separately from the DB write so the start pipeline can gather rows
 * for all sections and insert them in one transaction.
 */
export function buildSectionRows(
  section: SectionLetter,
  movement: MaterializableMovement,
): { boardRows: NewBoard[]; assignmentRows: Assignment[] } {
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
          section,
          roundNumber: r.roundNumber,
          tableNumber: m.tableNumber,
          boardNumber,
          copy: r.boardCopy ?? "A",
          ns: sectionParticipantId(section, r.ns),
          ew: sectionParticipantId(section, r.ew),
          status: r.sitOut ? "SIT_OUT" : "NOT_PLAYED",
        });
      }

      if (r.roundNumber === 1) {
        const seats = [
          { direction: "NS", movementId: r.ns },
          { direction: "EW", movementId: r.ew },
        ] as const;

        for (const { direction, movementId } of seats) {
          assignmentRows.push({
            id: sectionParticipantId(section, movementId),
            initialSeat: seatFor(section, m.tableNumber, direction),
          });
        }
      }
    }
  }

  return { boardRows, assignmentRows };
}

/**
 * Movement participant ids (the numeric position ids) restart within each
 * section, so they must be section-qualified before being written to the DB to
 * stay globally unique. This id is stored on both the assignment row (`id`) and
 * the board rows (`ns`/`ew`); keeping them prefixed identically preserves the
 * schedule join between assignment.id and boards.ns/ew.
 */
export function sectionParticipantId(
  section: SectionLetter,
  movementId: string,
): string {
  return `${section}${movementId}`;
}

/**
 * Materialize a single section's pair-like movement into the per-game database.
 * All inserts run inside a single transaction.
 *
 * This is deferred until the game is started (see the start-game handler); it is
 * intentionally free of validation and assumes the caller has already confirmed
 * the movement/seating is valid.
 */
export async function materializePairLikeMovement(
  section: SectionLetter,
  movement: MaterializableMovement,
  gameId: string,
) {
  const { boardRows, assignmentRows } = buildSectionRows(section, movement);

  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  db.transaction((tx) => {
    if (boardRows.length > 0) {
      tx.insert(boards).values(boardRows).run();
    }
    if (assignmentRows.length > 0) {
      tx.insert(assignments).values(assignmentRows).run();
    }
  });
}

/**
 * Materialize every section of a game in one transaction. Each entry pairs a
 * section letter with its already-resolved MaterializableMovement.
 */
export async function materializeSections(
  gameId: string,
  sections: { section: SectionLetter; movement: MaterializableMovement }[],
) {
  const boardRows: NewBoard[] = [];
  const assignmentRows: Assignment[] = [];

  for (const { section, movement } of sections) {
    const rows = buildSectionRows(section, movement);
    boardRows.push(...rows.boardRows);
    assignmentRows.push(...rows.assignmentRows);
  }

  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  db.transaction((tx) => {
    if (boardRows.length > 0) {
      tx.insert(boards).values(boardRows).run();
    }
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
      boardCopy: round.boardCopy,
    })),
  }));
}
