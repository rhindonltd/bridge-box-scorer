import "server-only";

import { getDb } from "@/modules/movement-catalog/storage/db";
import { eq } from "drizzle-orm";
import {
  pairmovementspec,
  PairMovementSpec,
} from "@/modules/movement-catalog/storage/db/schema";

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

