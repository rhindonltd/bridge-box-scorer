"use server";

import { getDb } from "@/db/games";
import {
  PlayerMovementMapEntry,
  playerMovementMap,
} from "@/db/games/individual/tables/player-movement-map";

export async function createIndividualPlayerMovementMapEntry(
  gameId: string,
  item: PlayerMovementMapEntry,
) {
  const db = await getDb(gameId);
  await db.insert(playerMovementMap).values(item);
}
