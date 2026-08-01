import {
  pairmovementtablespec,
  NewPairMovementTableSpec,
  teammovementtablespec,
  NewTeamMovementTableSpec,
} from "@/db/movements/schema";
import { getDb } from "@/db/movements";

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
