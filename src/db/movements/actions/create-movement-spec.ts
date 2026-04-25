import {
  individualmovementspec,
  IndividualMovementSpecInsert,
  pairmovementspec,
  PairMovementSpecInsert,
  teammovementspec,
  TeamMovementSpecInsert,
} from "@/db/movements/schema";
import { getDb } from "@/db/movements";

export async function createIndividualMovementSpec(
  data: IndividualMovementSpecInsert,
) {
  const db = await getDb();
  const result = await db.insert(individualmovementspec).values(data);
  return Number(result.lastInsertRowid);
}

export async function createPairMovementSpec(data: PairMovementSpecInsert) {
  const db = await getDb();
  const result = await db.insert(pairmovementspec).values(data);
  return Number(result.lastInsertRowid);
}

export async function createTeamMovementSpec(data: TeamMovementSpecInsert) {
  const db = await getDb();
  const result = await db.insert(teammovementspec).values(data);
  return Number(result.lastInsertRowid);
}
