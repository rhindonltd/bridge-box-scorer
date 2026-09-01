import "server-only";

import { getDb } from "@/db/movements";
import { eq } from "drizzle-orm";
import { pairmovementspec, PairMovementSpec } from "@/db/movements/schema";

/**
 * Fetch a single pair movement spec (metadata incl. missingPair) by id, or null
 * if it does not exist.
 */
export async function getPairMovementSpecById(
  id: number,
): Promise<PairMovementSpec | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(pairmovementspec)
    .where(eq(pairmovementspec.id, id));

  return rows[0] ?? null;
}
