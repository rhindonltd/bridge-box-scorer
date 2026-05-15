import {
  individualmovementroundspec,
  NewIndividualMovementRoundSpec,
  pairmovementroundspec,
  NewPairMovementRoundSpec,
  teammovementroundspec,
  NewTeamMovementRoundSpec,
} from "@/db/movements/schema";
import { getDb } from "@/db/movements";

export async function createIndividualMovementRoundSpec(
  data: NewIndividualMovementRoundSpec,
) {
  const db = await getDb();
  await db.insert(individualmovementroundspec).values(data);
}

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
