import {
  pairmovementspec,
  NewPairMovementSpec,
  teammovementspec,
  NewTeamMovementSpec,
} from "@/db/movements/schema";
import { getDb } from "@/db/movements";

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
