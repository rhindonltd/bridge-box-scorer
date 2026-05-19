"use server";

import { getDb } from "@/db/games";
import { players } from "@/db/games/shared/tables/players";
import { startingPositions } from "@/db/games/shared/tables/starting-positions";
import { eq } from "drizzle-orm";

export async function findStartingPositions(
  gameId: string,
): Promise<StartingPositionWithPlayer[]> {
  const db = await getDb(gameId);

  return db
    .select({
      tableNumber: startingPositions.tableNumber,
      direction: startingPositions.direction,
      player: {
        id: players.id,
        firstName: players.firstName,
        lastName: players.lastName,
        nationalId: players.nationalId,
      },
    })
    .from(startingPositions)
    .innerJoin(players, eq(startingPositions.player, players.id));
}

export type StartingPositionWithPlayer = {
  tableNumber: number;
  direction: string;
  player: {
    id: number;
    firstName: string;
    lastName: string;
    nationalId: string | null;
  };
};
