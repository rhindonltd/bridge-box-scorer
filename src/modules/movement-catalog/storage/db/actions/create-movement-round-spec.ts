import {
  pairmovementroundspec,
  NewPairMovementRoundSpec,
  teammovementroundspec,
  NewTeamMovementRoundSpec,
} from "@/modules/movement-catalog/storage/db/schema";
import { getDb } from "@/modules/movement-catalog/storage/db";

export async function createPairMovementRoundSpec(
  data: NewPairMovementRoundSpec,
) {
  const db = await getDb();
  await db.insert(pairmovementroundspec).values(data);
}

export async function createTeamMovementRoundSpec(
  data: NewTeamMovementRoundSpec,
) {
  const db = await getDb();
  await db.insert(teammovementroundspec).values(data);
}
