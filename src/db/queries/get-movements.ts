import { getDb } from "@/db";
import { movementspec, MovementSpecSelect } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getMovementSpecsForNumberOfTables(
  numberOfTables: number,
): Promise<MovementSpecSelect[]> {
  const db = await getDb();
  return db
    .select()
    .from(movementspec)
    .where(eq(movementspec.tables, numberOfTables));
}
