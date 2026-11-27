import { getDb } from "@/modules/movement-catalog/storage/db";
import {
  PairMovementSpec,
  pairmovementspec,
  TeamMovementSpec,
  teammovementroundspec,
  teammovementspec,
  teammovementtablespec,
} from "@/modules/movement-catalog/storage/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function getPairMovementSpecsForTables(
  tables: number,
): Promise<PairMovementSpec[]> {
  const db = await getDb();
  return db
    .select()
    .from(pairmovementspec)
    .where(eq(pairmovementspec.tables, tables));
}

/** The stored teams movements for a team count (one table per team). */
export async function getTeamMovementSpecsForTables(
  tables: number,
): Promise<TeamMovementSpec[]> {
  const db = await getDb();
  return db
    .select()
    .from(teammovementspec)
    .where(eq(teammovementspec.tables, tables));
}

/** One room of a stored teams movement, with the movement it belongs to. */
export interface TeamMovementRoomRow {
  movementId: number;
  tableNumber: number;
  roundNumber: number;
  ns: string;
  ew: string;
  boardSet: number;
}

/** Every room of the given stored teams movements, in one query. */
export async function getTeamMovementRooms(
  movementIds: number[],
): Promise<TeamMovementRoomRow[]> {
  if (movementIds.length === 0) return [];
  const db = await getDb();
  return db
    .select({
      movementId: teammovementtablespec.movementId,
      tableNumber: teammovementtablespec.tableNumber,
      roundNumber: teammovementroundspec.roundNumber,
      ns: teammovementroundspec.ns,
      ew: teammovementroundspec.ew,
      boardSet: teammovementroundspec.boardSet,
    })
    .from(teammovementroundspec)
    .innerJoin(
      teammovementtablespec,
      eq(teammovementroundspec.tableId, teammovementtablespec.id),
    )
    .where(inArray(teammovementtablespec.movementId, movementIds));
}
