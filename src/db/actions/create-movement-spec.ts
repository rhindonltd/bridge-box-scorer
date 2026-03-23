import { movementspec, MovementSpecInsert } from "@/db/schema";
import { db } from "@/db";

export async function createMovementSpec(data: MovementSpecInsert) {
  const result = await db.insert(movementspec).values(data);
  return Number(result.lastInsertRowid);
}
