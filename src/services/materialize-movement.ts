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
   * When true, this (table, round) is the compensated (unplayed) half of a
   * Swiss Pairs "2 half matches" group: its boards are written with status
   * HALF_AVERAGE (never played or submittable) and the half-match scorer
   * recomputes the AVE+/AVE credit across them. `ns` is the non-anchor pair
   * being compensated; `ew` is a phantom. Mutually exclusive with `sitOut`.
   */
  halfAverage?: boolean;
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
  // Participant ids already given a round-1 assignment. A Swiss "2 half
  // matches" round can seat the anchor in two round-1 entries (its two halves);
  // its assignment must be written once, not duplicated (a duplicate PK insert
  // would fail). Every other movement seats each pair once in round 1, so this
  // guard is a no-op there.
  const assigned = new Set<string>();

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
          status: r.sitOut
            ? "SIT_OUT"
            : r.halfAverage
              ? "HALF_AVERAGE"
              : "NOT_PLAYED",
        });
      }

      // A half-average (compensation) block is a phantom placeholder, never a
      // real seat — it must not seed a round-1 assignment (that would clash
      // with the non-anchor pair's real seat in its played half). Sit-out rows
      // keep assigning (the sitting pair's NS seat is its real home).
      if (r.roundNumber === 1 && !r.halfAverage) {
        const seats = [
          { direction: "NS", movementId: r.ns },
          { direction: "EW", movementId: r.ew },
        ] as const;

        for (const { direction, movementId } of seats) {
          const id = sectionParticipantId(section, movementId);
          if (assigned.has(id)) continue;
          assigned.add(id);
          assignmentRows.push({
            id,
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
  await insertSectionRows(gameId, boardRows, assignmentRows);
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

  await insertSectionRows(gameId, boardRows, assignmentRows);
}

/**
 * Insert the given board and assignment rows into the game's database in a
 * single transaction. Shared by the single-section and all-sections
 * materializers so the transaction shape lives in one place.
 */
async function insertSectionRows(
  gameId: string,
  boardRows: NewBoard[],
  assignmentRows: Assignment[],
) {
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
 * Convert a generated, fully-expanded {@link Tables} movement (board numbers
 * already applied) into the {@link MaterializableMovement} shape the DB writers
 * consume. Movement-agnostic: it only reads the per-table, per-round layout, so
 * every generator that emits `Tables` — Mitchell-family pairs and Teams Round
 * Robin alike — shares it.
 */
export function tablesToMaterializableMovement(
  tables: Tables,
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

/**
 * Convert the generateMitchell output (Tables) into the MaterializableMovement
 * shape. Thin alias over {@link tablesToMaterializableMovement}, kept for its
 * existing Mitchell call sites.
 */
export function mitchellToPairMovement(
  tables: Tables,
): MaterializableMovement {
  return tablesToMaterializableMovement(tables);
}

/**
 * Convert a generated Teams Round Robin (`generateRoundRobinTeams` output) into
 * the MaterializableMovement shape. Thin alias over
 * {@link tablesToMaterializableMovement}; named for its call site so the start
 * pipeline reads clearly.
 */
export function roundRobinTeamsToMaterializable(
  tables: Tables,
): MaterializableMovement {
  return tablesToMaterializableMovement(tables);
}
