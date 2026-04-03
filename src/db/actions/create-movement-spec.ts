import { movementspec, MovementSpecInsert } from "@/db/schema";
import { getDb } from "@/db";

export async function createMovementSpec(data: MovementSpecInsert) {
  const db = await getDb();
  const result = await db.insert(movementspec).values(data);
  return Number(result.lastInsertRowid);
}
