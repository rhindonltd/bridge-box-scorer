"use server";

import { getDb } from "@/db/games";
import { players } from "@/db/games/shared/tables/players";
import { startingpositions } from "@/db/games/shared/tables/starting-positions";
import { eq } from "drizzle-orm";

export async function findStartingPositions(
  gameId: string,
): Promise<StartingPositionWithPlayer[]> {
  const db = await getDb(gameId);

  return db
    .select({
      tableNumber: startingpositions.tableNumber,
      direction: startingpositions.direction,
      player: {
        id: players.id,
        firstName: players.firstName,
        lastName: players.lastName,
        nationalId: players.nationalId,
      },
    })
    .from(startingpositions)
    .innerJoin(players, eq(startingpositions.player, players.id));
}

export type StartingPositionWithPlayer = {
  tableNumber: number;
  direction: string;
  player: {
    firstName: string;
    lastName: string;
    nationalId: string | null;
  };
};
