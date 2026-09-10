import "server-only";

import { getDb } from "@/db/movements";
import {
  pairmovementspec,
  pairmovementtablespec,
  pairmovementroundspec,
  teammovementspec,
  teammovementtablespec,
  teammovementroundspec,
} from "@/db/movements/schema";
import {
  createPairMovementSpec,
  createTeamMovementSpec,
} from "@/db/movements/actions/create-movement-spec";
import {
  createPairMovementTableSpec,
  createTeamMovementTableSpec,
} from "@/db/movements/actions/create-movement-table-spec";
import {
  createPairMovementRoundSpec,
  createTeamMovementRoundSpec,
} from "@/db/movements/actions/create-movement-round-spec";
import { generatePairsMovements } from "@/movement/pairsMovements";
import { generateTeamsMovements } from "@/movement/teamsMovements";
import { boardSetFor, Movement } from "@/movement/shared";

/**
 * Idempotent refresh of the movement catalogue in movements.db.
 *
 * The catalogue is fully derived from the committed source files
 * (PSMovements.txt / TSMovements.txt), so a "refresh" is: wipe the six spec
 * tables and re-seed them from the generators. Unlike a plain seed, this is
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
 * Returns the number of pair and team movement specs written so callers (the
 * CLI) can log it.
 */
export async function refreshMovements(): Promise<{
  pairs: number;
  teams: number;
}> {
  const db = await getDb();
  const pairMovements = generatePairsMovements();
  const teamMovements = generateTeamsMovements();

  // better-sqlite3 transactions are synchronous; the callback must not return a
  // promise, so the deletes run as synchronous drizzle statements here.
  db.transaction((tx) => {
    // Delete children before parents to respect foreign keys.
    tx.delete(pairmovementroundspec).run();
    tx.delete(pairmovementtablespec).run();
    tx.delete(pairmovementspec).run();
    tx.delete(teammovementroundspec).run();
    tx.delete(teammovementtablespec).run();
    tx.delete(teammovementspec).run();
  });

  await seedPairMovements(pairMovements);
  await seedTeamMovements(teamMovements);

  return { pairs: pairMovements.length, teams: teamMovements.length };
}

async function seedPairMovements(movements: Movement<"PAIR">[]) {
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

async function seedTeamMovements(movements: Movement<"PAIR">[]) {
  for (const movement of movements) {
    const movementId = await createTeamMovementSpec({
      name: movement.name,
      type: movement.type.toString(),
      tables: movement.tables,
      boards: movement.boards,
      boardsPerRound: movement.boardsPerRound,
      rounds: movement.rounds,
    });

    for (const table of movement.tableData) {
      const tableId = await createTeamMovementTableSpec({
        movementId,
        tableNumber: table.table,
      });

      for (const round of table.rounds) {
        const idx = table.rounds.indexOf(round);
        await createTeamMovementRoundSpec({
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
