import "server-only";

import { getDb } from "@/modules/movement-catalog/storage/db";
import { eq } from "drizzle-orm";
import {
  pairmovementtablespec,
  pairmovementroundspec,
  PairMovementRoundSpec,
  PairMovementTableSpec,
} from "@/modules/movement-catalog/storage/db/schema";

export async function getPairMovement(
  movementSpecId: number,
): Promise<PairMovement[]> {
  const tablesWithRounds: PairMovement[] = [];

  for (const table of await getPairMovementTableSpecsForMovementSpecId(
    movementSpecId,
  )) {
    tablesWithRounds.push({
      ...table,
      rounds: await getPairMovementRoundSpecsForMovementSpecTableId(table.id),
    });
  }

  return tablesWithRounds;
}

export type PairMovement = {
  id: number;
  movementId: number;
  tableNumber: number;
  rounds: PairMovementRoundSpec[];
};

async function getPairMovementTableSpecsForMovementSpecId(
  movementSpecId: number,
): Promise<PairMovementTableSpec[]> {
  const db = await getDb();
  return db
    .select()
    .from(pairmovementtablespec)
    .where(eq(pairmovementtablespec.movementId, movementSpecId));
}

async function getPairMovementRoundSpecsForMovementSpecTableId(
  movementTableSpecId: number,
): Promise<PairMovementRoundSpec[]> {
  const db = await getDb();
  return db
    .select()
    .from(pairmovementroundspec)
    .where(eq(pairmovementroundspec.tableId, movementTableSpecId));
}

