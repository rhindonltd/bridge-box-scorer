import { movementtablespec, MovementTableSpecInsert } from "@/db/schema";
import { getDb } from "@/db";

export async function createMovementTableSpec(data: MovementTableSpecInsert) {
  const db = await getDb();
  const result = await db.insert(movementtablespec).values(data);
  return Number(result.lastInsertRowid);
}
