"use server";

import { getDb } from "@/db";
import { eq } from "drizzle-orm";
import { pairmovementtablespec, pairmovementroundspec, individualmovementtablespec, individualmovementroundspec, teammovementtablespec, teammovementroundspec } from "@/db/schema";

export async function getIndividualMovement(movementSpecId: number) {
    const tablesWithRounds = [];

    for (const table of await getIndividualMovementTableSpecsForMovementSpecId(
        movementSpecId,
    )) {
        tablesWithRounds.push({
            ...table,
            rounds: await getIndividualMovementRoundSpecsForMovementSpecTableId(table.id),
        });
    }

    return tablesWithRounds;
}

export async function getPairMovement(movementSpecId: number) {
  const tablesWithRounds = [];

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

export async function getTeamMovement(movementSpecId: number) {
    const tablesWithRounds = [];

    for (const table of await getTeamMovementTableSpecsForMovementSpecId(
        movementSpecId,
    )) {
        tablesWithRounds.push({
            ...table,
            rounds: await getTeamMovementRoundSpecsForMovementSpecTableId(table.id),
        });
    }

    return tablesWithRounds;
}

async function getIndividualMovementTableSpecsForMovementSpecId(movementSpecId: number) {
    const db = await getDb();
    return db
        .select()
        .from(individualmovementtablespec)
        .where(eq(individualmovementtablespec.movementId, movementSpecId));
}

async function getIndividualMovementRoundSpecsForMovementSpecTableId(
    movementTableSpecId: number,
) {
    const db = await getDb();
    return db
        .select()
        .from(individualmovementroundspec)
        .where(eq(individualmovementroundspec.tableId, movementTableSpecId));
}

async function getPairMovementTableSpecsForMovementSpecId(movementSpecId: number) {
  const db = await getDb();
  return db
    .select()
    .from(pairmovementtablespec)
    .where(eq(pairmovementtablespec.movementId, movementSpecId));
}

async function getPairMovementRoundSpecsForMovementSpecTableId(
  movementTableSpecId: number,
) {
  const db = await getDb();
  return db
    .select()
    .from(pairmovementroundspec)
    .where(eq(pairmovementroundspec.tableId, movementTableSpecId));
}

async function getTeamMovementTableSpecsForMovementSpecId(movementSpecId: number) {
    const db = await getDb();
    return db
        .select()
        .from(teammovementtablespec)
        .where(eq(teammovementtablespec.movementId, movementSpecId));
}

async function getTeamMovementRoundSpecsForMovementSpecTableId(
    movementTableSpecId: number,
) {
    const db = await getDb();
    return db
        .select()
        .from(teammovementroundspec)
        .where(eq(teammovementroundspec.tableId, movementTableSpecId));
}
