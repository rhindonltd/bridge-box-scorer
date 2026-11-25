import "server-only";

/**
 * movement-catalog, server entry (docs/design/modules.md §6.3).
 *
 * The stored catalogue: movements.db (seeded from PSMovements.txt /
 * TSMovements.txt) and reading a selected movement for the start of a game.
 * Everything here reaches the database or the file system; the pure helpers
 * are in the module's main entry.
 */

import type { CatalogMovementSummary } from "./catalog-summary";
import type { MovementByTable } from "./display/movementData";
import {
  describeGeneratedMovement,
  describeStoredMovement,
  type FixedSelectedMovement,
  type MovementDescription,
} from "./plan/describe-movement";
import { boardRangeForSet } from "./shared";
import { getPairMovementSpecsForTables } from "./storage/db/queries/get-movements";
import {
  getPairMovement,
  getTeamMovement,
} from "./storage/db/queries/get-movement";
import {
  getPairMovementSpecById,
  getTeamMovementSpecById,
} from "./storage/db/queries/get-movement-spec";

export { refreshCatalog } from "./storage/db/actions/refresh-movements";
export { runCatalogMigrations } from "./storage/db/migrate";

/** The stored pair movements for a table count. */
export function listPairMovements(
  tables: number,
): Promise<CatalogMovementSummary[]> {
  return getPairMovementSpecsForTables(tables);
}

/** One stored movement laid out by table, for the movement preview. */
export interface MovementDetail {
  name: string;
  tables: MovementByTable[];
}

/**
 * One stored movement laid out by table, or null when no movement has that id.
 * Rounds store only a board-set index; board numbers are computed from the
 * movement's own default boards-per-round.
 */
export async function getMovementDetail(
  kind: "PAIRS" | "TEAMS",
  id: number,
): Promise<MovementDetail | null> {
  const [movement, spec] =
    kind === "PAIRS"
      ? await Promise.all([getPairMovement(id), getPairMovementSpecById(id)])
      : await Promise.all([getTeamMovement(id), getTeamMovementSpecById(id)]);
  if (!spec) return null;

  return {
    name: spec.name,
    tables: movement.map((table) => ({
      tableNumber: table.tableNumber,
      rounds: table.rounds.map((round) => ({
        roundNumber: round.roundNumber,
        ns: round.ns,
        ew: round.ew,
        ...boardRangeForSet(round.boardSet, spec.boardsPerRound),
      })),
    })),
  };
}

/**
 * Lay out a fixed movement selection with every seat filled, ready for the
 * start check and then `planMovement`. A Mitchell or Round Robin is generated
 * from its spec; a stored spec is read from movements.db.
 */
export async function describeMovement(
  selected: FixedSelectedMovement,
): Promise<MovementDescription> {
  if (selected.source !== "SPEC") {
    return describeGeneratedMovement(selected);
  }
  const [movement, spec] = await Promise.all([
    getPairMovement(selected.specId),
    getPairMovementSpecById(selected.specId),
  ]);
  return describeStoredMovement(selected, movement, spec?.missingPair);
}
