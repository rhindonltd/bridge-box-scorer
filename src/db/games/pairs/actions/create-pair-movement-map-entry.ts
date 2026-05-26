"use server";

import { getDb } from "@/db/games/pairs";
import {
  PairMovementMapEntry,
  pairMovementMap,
} from "@/db/games/pairs/tables/pair-movement-map";

export async function createPairMovementMapEntry(
  gameId: string,
  item: PairMovementMapEntry,
) {
  const db = await getDb(gameId);
  await db.insert(pairMovementMap).values(item);
}
