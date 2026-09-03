import { getDb } from "@/db/movements";
import { PairMovementSpec, pairmovementspec } from "@/db/movements/schema";
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
