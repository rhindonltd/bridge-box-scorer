import {
  pairmovementspec,
  NewPairMovementSpec,
} from "@/modules/movement-catalog/storage/db/schema";
import { getDb } from "@/modules/movement-catalog/storage/db";

export async function createPairMovementSpec(data: NewPairMovementSpec) {
  const db = await getDb();
  const result = await db.insert(pairmovementspec).values(data);
  return Number(result.lastInsertRowid);
}

