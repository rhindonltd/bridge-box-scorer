import { movementroundspec, MovementRoundSpecInsert } from "@/db/schema";
import { getDb } from "@/db";

export async function createMovementRoundSpec(data: MovementRoundSpecInsert) {
  const db = await getDb();
  await db.insert(movementroundspec).values(data);
}
