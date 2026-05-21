"use server";

import { getDb } from "@/db/movements";
import { eq } from "drizzle-orm";
import {
  pairmovementtablespec,
  pairmovementroundspec,
  individualmovementtablespec,
  individualmovementroundspec,
  teammovementtablespec,
  teammovementroundspec,
  TeamMovementRoundSpec,
  TeamMovementTableSpec,
  PairMovementRoundSpec,
  PairMovementTableSpec,
  IndividualMovementRoundSpec,
  IndividualMovementTableSpec,
} from "@/db/movements/schema";

export async function getIndividualMovement(
  movementSpecId: number,
): Promise<IndividualMovement[]> {
  const tablesWithRounds: IndividualMovement[] = [];

  for (const table of await getIndividualMovementTableSpecsForMovementSpecId(
    movementSpecId,
  )) {
    tablesWithRounds.push({
      ...table,
      rounds: await getIndividualMovementRoundSpecsForMovementSpecTableId(
        table.id,
      ),
    });
  }

  return tablesWithRounds;
}

export type IndividualMovement = {
  id: number;
  movementId: number;
  tableNumber: number;
  rounds: IndividualMovementRoundSpec[];
};

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

export async function getTeamMovement(
  movementSpecId: number,
): Promise<TeamMovement[]> {
  const tablesWithRounds: TeamMovement[] = [];

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

export type TeamMovement = {
  id: number;
  movementId: number;
  tableNumber: number;
  rounds: TeamMovementRoundSpec[];
};

async function getIndividualMovementTableSpecsForMovementSpecId(
  movementSpecId: number,
): Promise<IndividualMovementTableSpec[]> {
  const db = await getDb();
  return db
    .select()
    .from(individualmovementtablespec)
    .where(eq(individualmovementtablespec.movementId, movementSpecId));
}

async function getIndividualMovementRoundSpecsForMovementSpecTableId(
  movementTableSpecId: number,
): Promise<IndividualMovementRoundSpec[]> {
  const db = await getDb();
  return db
    .select()
    .from(individualmovementroundspec)
    .where(eq(individualmovementroundspec.tableId, movementTableSpecId));
}

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

async function getTeamMovementTableSpecsForMovementSpecId(
  movementSpecId: number,
): Promise<TeamMovementTableSpec[]> {
  const db = await getDb();
  return db
    .select()
    .from(teammovementtablespec)
    .where(eq(teammovementtablespec.movementId, movementSpecId));
}

async function getTeamMovementRoundSpecsForMovementSpecTableId(
  movementTableSpecId: number,
): Promise<TeamMovementRoundSpec[]> {
  const db = await getDb();
  return db
    .select()
    .from(teammovementroundspec)
    .where(eq(teammovementroundspec.tableId, movementTableSpecId));
}
