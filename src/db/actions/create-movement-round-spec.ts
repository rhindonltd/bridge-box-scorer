import { movementroundspec, MovementRoundSpecInsert } from "@/db/schema";
import { db } from "@/db";

export async function createMovementRoundSpec(data: MovementRoundSpecInsert) {
  await db.insert(movementroundspec).values(data);
}
