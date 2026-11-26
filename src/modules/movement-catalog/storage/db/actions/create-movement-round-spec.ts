import {
  pairmovementroundspec,
  NewPairMovementRoundSpec,
} from "@/modules/movement-catalog/storage/db/schema";
import { getDb } from "@/modules/movement-catalog/storage/db";

export async function createPairMovementRoundSpec(
  data: NewPairMovementRoundSpec,
) {
  const db = await getDb();
  await db.insert(pairmovementroundspec).values(data);
}

