"use server";

import { db } from "@/db";
import { movementroundspec, movementtablespec } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getMovement(movementSpecId: number) {
  const tablesWithRounds = [];

  for (const table of await getMovementTableSpecsForMovementSpecId(
    movementSpecId,
  )) {
    tablesWithRounds.push({
      ...table,
      rounds: await getMovementRoundSpecsForMovementSpecTableId(table.id),
    });
  }

  return tablesWithRounds;
}

async function getMovementTableSpecsForMovementSpecId(movementSpecId: number) {
  return db
    .select()
    .from(movementtablespec)
    .where(eq(movementtablespec.movementId, movementSpecId));
}

async function getMovementRoundSpecsForMovementSpecTableId(
  movementTableSpecId: number,
) {
  return db
    .select()
    .from(movementroundspec)
    .where(eq(movementroundspec.tableId, movementTableSpecId));
}
