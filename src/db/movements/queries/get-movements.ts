import { getDb } from "@/db/movements";
import {
  individualmovementspec,
  PairMovementSpec,
  pairmovementspec,
  TeamMovementSpec,
  teammovementspec,
} from "@/db/movements/schema";
import { eq } from "drizzle-orm";
import { IndividualMovementSpec } from "../schema";

export async function getIndividualMovementSpecsForTables(
  tables: number,
): Promise<IndividualMovementSpec[]> {
  const db = await getDb();
  return db
    .select()
    .from(individualmovementspec)
    .where(eq(individualmovementspec.tables, tables));
}

export async function getPairMovementSpecsForTables(
  tables: number,
): Promise<PairMovementSpec[]> {
  const db = await getDb();
  return db
    .select()
    .from(pairmovementspec)
    .where(eq(pairmovementspec.tables, tables));
}

export async function getTeamMovementSpecsForTables(
  tables: number,
): Promise<TeamMovementSpec[]> {
  const db = await getDb();
  return db
    .select()
    .from(teammovementspec)
    .where(eq(teammovementspec.tables, tables));
}
