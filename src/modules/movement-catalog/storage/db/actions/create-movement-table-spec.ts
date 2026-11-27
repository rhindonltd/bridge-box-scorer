import {
  pairmovementtablespec,
  NewPairMovementTableSpec,
  teammovementtablespec,
  NewTeamMovementTableSpec,
} from "@/modules/movement-catalog/storage/db/schema";
import { getDb } from "@/modules/movement-catalog/storage/db";

export async function createPairMovementTableSpec(
  data: NewPairMovementTableSpec,
) {
  const db = await getDb();
  const result = await db.insert(pairmovementtablespec).values(data);
  return Number(result.lastInsertRowid);
}

export async function createTeamMovementTableSpec(
  data: NewTeamMovementTableSpec,
) {
  const db = await getDb();
  const result = await db.insert(teammovementtablespec).values(data);
  return Number(result.lastInsertRowid);
}
