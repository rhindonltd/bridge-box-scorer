import {
  individualmovementtablespec,
  IndividualMovementTableSpecInsert,
  pairmovementtablespec,
  PairMovementTableSpecInsert,
  teammovementtablespec,
  TeamMovementTableSpecInsert,
} from "@/db/movements/schema";
import { getDb } from "@/db/movements";

export async function createIndividualMovementTableSpec(
  data: IndividualMovementTableSpecInsert,
) {
  const db = await getDb();
  const result = await db.insert(individualmovementtablespec).values(data);
  return Number(result.lastInsertRowid);
}

export async function createPairMovementTableSpec(
  data: PairMovementTableSpecInsert,
) {
  const db = await getDb();
  const result = await db.insert(pairmovementtablespec).values(data);
  return Number(result.lastInsertRowid);
}

export async function createTeamMovementTableSpec(
  data: TeamMovementTableSpecInsert,
) {
  const db = await getDb();
  const result = await db.insert(teammovementtablespec).values(data);
  return Number(result.lastInsertRowid);
}
