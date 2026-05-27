"use server";

import { getDb as individualDb } from "@/db/games/individual";
import { getDb as pairDb } from "@/db/games/pairs";
import {
  InitialSeat,
  initialSeat,
} from "@/db/games/shared/tables/initial-seat";
import { GameType } from "@/db/games/types/game-type";

export async function findInitialSeats(
  gameType: GameType,
  gameId: string,
): Promise<InitialSeat[]> {
  const db = await (gameType == "INDIVIDUAL"
    ? individualDb(gameId)
    : pairDb(gameId));

  return db.select().from(initialSeat);
}
