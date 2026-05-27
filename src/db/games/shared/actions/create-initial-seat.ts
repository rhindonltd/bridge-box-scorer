"use server";

import { getDb as individualDb } from "@/db/games/individual";
import { getDb as pairDb } from "@/db/games/pairs";
import {
  initialSeat,
  InitialSeat,
} from "@/db/games/shared/tables/initial-seat";
import { GameType } from "@/db/games/types/game-type";

export async function createInitialSeat(
  gameType: GameType,
  gameId: string,
  data: InitialSeat,
) {
  const db = await (gameType == "INDIVIDUAL"
    ? individualDb(gameId)
    : pairDb(gameId));
  await db.insert(initialSeat).values(data);
}
