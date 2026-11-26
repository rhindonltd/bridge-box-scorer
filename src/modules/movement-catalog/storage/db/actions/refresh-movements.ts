import "server-only";

import { getDb } from "@/modules/movement-catalog/storage/db";
import {
  pairmovementspec,
  pairmovementtablespec,
  pairmovementroundspec,
} from "@/modules/movement-catalog/storage/db/schema";
import { createPairMovementSpec } from "./create-movement-spec";
import { createPairMovementTableSpec } from "./create-movement-table-spec";
import { createPairMovementRoundSpec } from "./create-movement-round-spec";
import { generatePairsMovements } from "@/modules/movement-catalog/storage/pairsMovements";
import {
  boardSetFor,
  MovementFileEntry,
} from "@/modules/movement-catalog/shared";

/**
 * Idempotent refresh of the movement catalogue in movements.db.
 *
 * The catalogue is fully derived from the committed source files
 * (PSMovements.txt), so a "refresh" is: wipe the three spec tables and
 * re-seed them from the generator. Unlike a plain seed, this is
 * safe to run repeatedly — re-running never duplicates rows.
 *
 * The wipe + reseed runs inside a single transaction so a failure mid-way
 * leaves the existing catalogue untouched rather than half-populated. Rows are
 * deleted in FK-safe order (rounds → tables → specs).
 *
 * Movement spec ids are autoincrement, file-order artifacts of the seed; they
 * are intentionally not treated as stable keys, so a full clear-and-reseed is
 * the correct refresh strategy here (see resolve-recommendation.ts, which keys
 * off the (name, tables, rounds) triple rather than the numeric id).
 *
 * Returns the number of pair movement specs written so callers (the CLI) can
 * log it.
 */
export async function refreshCatalog(): Promise<{ pairs: number }> {
  const db = await getDb();
  const pairMovements = generatePairsMovements();

  // better-sqlite3 transactions are synchronous; the callback must not return a
  // promise, so the deletes run as synchronous drizzle statements here.
  db.transaction((tx) => {
    // Delete children before parents to respect foreign keys.
    tx.delete(pairmovementroundspec).run();
    tx.delete(pairmovementtablespec).run();
    tx.delete(pairmovementspec).run();
  });

  await seedPairMovements(pairMovements);
  return { pairs: pairMovements.length };
}

async function seedPairMovements(movements: MovementFileEntry[]) {
  for (const movement of movements) {
    const movementId = await createPairMovementSpec({
      name: movement.name,
      type: movement.type.toString(),
      tables: movement.tables,
      boards: movement.boards,
      boardsPerRound: movement.boardsPerRound,
      rounds: movement.rounds,
      missingPair: movement.missingParticipant ?? null,
    });

    for (const table of movement.tableData) {
      const tableId = await createPairMovementTableSpec({
        movementId,
        tableNumber: table.table,
      });

      for (const round of table.rounds) {
        const idx = table.rounds.indexOf(round);
        await createPairMovementRoundSpec({
          tableId,
          roundNumber: idx + 1,
          ns: round.participants.nsId,
          ew: round.participants.ewId,
          boardSet: boardSetFor(round.boards[0], movement.boardsPerRound),
        });
      }
    }
  }
}

