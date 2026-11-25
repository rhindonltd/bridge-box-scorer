import { getDb } from "@/modules/movement-catalog/storage/db";
import {
  PairMovementSpec,
  pairmovementspec,
} from "@/modules/movement-catalog/storage/db/schema";
import { eq } from "drizzle-orm";

export async function getPairMovementSpecsForTables(
  tables: number,
): Promise<PairMovementSpec[]> {
  const db = await getDb();
  return db
    .select()
    .from(pairmovementspec)
    .where(eq(pairmovementspec.tables, tables));
}
