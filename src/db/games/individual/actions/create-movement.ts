"use server";

import { getDb } from "@/db/games/individual";
import {
  IndividualMovement,
  movements,
} from "@/db/games/individual/tables/movements";

export async function createIndividualMovement(
  gameId: string,
  item: IndividualMovement,
) {
  const db = await getDb(gameId);
  await db.insert(movements).values(item);
}
