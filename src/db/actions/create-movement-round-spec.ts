import { individualmovementroundspec, IndividualMovementRoundSpecInsert, pairmovementroundspec, PairMovementRoundSpecInsert, teammovementroundspec, TeamMovementRoundSpecInsert } from "@/db/schema";
import { getDb } from "@/db";

export async function createIndividualMovementRoundSpec(data: IndividualMovementRoundSpecInsert) {
    const db = await getDb();
    await db.insert(individualmovementroundspec).values(data);
}

export async function createPairMovementRoundSpec(data: PairMovementRoundSpecInsert) {
  const db = await getDb();
  await db.insert(pairmovementroundspec).values(data);
}

export async function createTeamMovementRoundSpec(data: TeamMovementRoundSpecInsert) {
    const db = await getDb();
    await db.insert(teammovementroundspec).values(data);
}
