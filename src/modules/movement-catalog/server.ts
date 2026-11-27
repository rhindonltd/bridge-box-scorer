import "server-only";

/**
 * movement-catalog, server entry (docs/design/modules.md §6.3).
 *
 * The stored catalogue: movements.db (seeded from PSMovements.txt /
 * TSMovements.txt) and reading a selected movement for the start of a game.
 * Everything here reaches the database or the file system; the pure helpers
 * are in the module's main entry.
 */

import type {
  CatalogMovementSummary,
  TeamsCatalogMovementSummary,
} from "./catalog-summary";
import type { MovementByTable } from "./display/movementData";
import {
  describeGeneratedMovement,
  describeStoredMovement,
  describeStoredTeamsMovement,
  type FixedSelectedMovement,
  type MovementDescription,
  type StoredMovementTable,
} from "./plan/describe-movement";
import { boardRangeForSet } from "./shared";
import {
  getPairMovementSpecsForTables,
  getTeamMovementRooms,
  getTeamMovementSpecsForTables,
  type TeamMovementRoomRow,
} from "./storage/db/queries/get-movements";
import { getPairMovement } from "./storage/db/queries/get-movement";
import {
  getPairMovementSpecById,
  getTeamMovementSpecById,
} from "./storage/db/queries/get-movement-spec";
import {
  isAmericanWhistTeamsLayout,
  isCirculationTeamsLayout,
  isSupportedTeamsMovement,
  isThurnerTeamsLayout,
} from "./teams/teams-library";

export { refreshCatalog } from "./storage/db/actions/refresh-movements";
export { runCatalogMigrations } from "./storage/db/migrate";

/** The stored pair movements for a table count. */
export function listPairMovements(
  tables: number,
): Promise<CatalogMovementSummary[]> {
  return getPairMovementSpecsForTables(tables);
}

/**
 * The stored teams movements for a team count that the app can run (see
 * `isSupportedTeamsMovement`), in the library's order. The library's American
 * Whist, Circulation and Thurner movements are left out: the app generates
 * those itself.
 */
export async function listTeamMovements(
  teams: number,
): Promise<TeamsCatalogMovementSummary[]> {
  const specs = await getTeamMovementSpecsForTables(teams);
  const tablesById = storedTeamsTablesById(
    await getTeamMovementRooms(specs.map((spec) => spec.id)),
  );
  return specs
    .filter((spec) => {
      const tables = tablesById.get(spec.id) ?? [];
      return (
        isSupportedTeamsMovement(tables) &&
        !isAmericanWhistTeamsLayout(tables) &&
        !isCirculationTeamsLayout(tables) &&
        !isThurnerTeamsLayout(tables)
      );
    })
    .map(({ id, name, tables, boards, boardsPerRound, rounds }) => ({
      id,
      name,
      tables,
      boards,
      boardsPerRound,
      rounds,
    }));
}

/** Group stored teams rooms into each movement's tables, in table/round order. */
function storedTeamsTablesById(
  rooms: TeamMovementRoomRow[],
): Map<number, StoredMovementTable[]> {
  const byMovement = new Map<number, Map<number, StoredMovementTable>>();
  for (const room of rooms) {
    const tables = byMovement.get(room.movementId) ?? new Map();
    byMovement.set(room.movementId, tables);
    const table = tables.get(room.tableNumber) ?? {
      tableNumber: room.tableNumber,
      rounds: [],
    };
    tables.set(room.tableNumber, table);
    table.rounds.push({
      roundNumber: room.roundNumber,
      ns: room.ns,
      ew: room.ew,
      boardSet: room.boardSet,
    });
  }
  const out = new Map<number, StoredMovementTable[]>();
  for (const [id, tables] of byMovement) {
    out.set(
      id,
      [...tables.values()]
        .sort((a, b) => a.tableNumber - b.tableNumber)
        .map((table) => ({
          ...table,
          rounds: table.rounds.sort((a, b) => a.roundNumber - b.roundNumber),
        })),
    );
  }
  return out;
}

/** One stored teams movement's tables, in table/round order. */
async function storedTeamsTables(id: number): Promise<StoredMovementTable[]> {
  return storedTeamsTablesById(await getTeamMovementRooms([id])).get(id) ?? [];
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
  id: number,
): Promise<MovementDetail | null> {
  const [movement, spec] = await Promise.all([
    getPairMovement(id),
    getPairMovementSpecById(id),
  ]);
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
 * start check and then `planMovement`. A Mitchell or American Whist is
 * generated from its spec; a stored spec is read from movements.db.
 */
export async function describeMovement(
  selected: FixedSelectedMovement,
): Promise<MovementDescription> {
  if (selected.source === "TEAMS_SPEC") {
    return describeStoredTeamsMovement(
      selected,
      await storedTeamsTables(selected.specId),
    );
  }
  if (selected.source !== "SPEC") {
    return describeGeneratedMovement(selected);
  }
  const [movement, spec] = await Promise.all([
    getPairMovement(selected.specId),
    getPairMovementSpecById(selected.specId),
  ]);
  return describeStoredMovement(selected, movement, spec?.missingPair);
}

/**
 * One stored teams movement laid out by table, for the movement preview, or
 * null when no supported teams movement has that id. Each round shows the
 * home team (NS) and the visiting team (EW) by number, with board numbers from
 * the movement's own default boards-per-round.
 */
export async function getTeamMovementDetail(
  id: number,
): Promise<MovementDetail | null> {
  const [tables, spec] = await Promise.all([
    storedTeamsTables(id),
    getTeamMovementSpecById(id),
  ]);
  if (!spec || !isSupportedTeamsMovement(tables)) return null;
  return {
    name: spec.name,
    tables: tables.map((table) => ({
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
