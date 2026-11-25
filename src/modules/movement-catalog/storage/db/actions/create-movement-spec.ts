import {
  pairmovementspec,
  NewPairMovementSpec,
  teammovementspec,
  NewTeamMovementSpec,
} from "@/modules/movement-catalog/storage/db/schema";
import { getDb } from "@/modules/movement-catalog/storage/db";

export async function createPairMovementSpec(data: NewPairMovementSpec) {
  const db = await getDb();
  const result = await db.insert(pairmovementspec).values(data);
  return Number(result.lastInsertRowid);
}

export async function createTeamMovementSpec(data: NewTeamMovementSpec) {
  const db = await getDb();
  const result = await db.insert(teammovementspec).values(data);
  return Number(result.lastInsertRowid);
}
