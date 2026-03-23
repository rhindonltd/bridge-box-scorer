import { movementtablespec, MovementTableSpecInsert } from "@/db/schema";
import { db } from "@/db";

export async function createMovementTableSpec(data: MovementTableSpecInsert) {
  const result = await db.insert(movementtablespec).values(data);
  return Number(result.lastInsertRowid);
}
