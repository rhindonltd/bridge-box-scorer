"use server";

import { getDb } from "@/db/games/individual";
import { players } from "@/db/games/shared/tables/players";
import { startingpositions } from "@/db/games/shared/tables/starting-positions";
import { Direction } from "@/model/common";
import { eq } from "drizzle-orm";

export async function findPlayerStartingPositions(
  gameId: string,
): Promise<PlayerStartingPosition[]> {
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

export type PlayerStartingPosition = {
  tableNumber: number;
  direction: Direction;
  player: {
    firstName: string;
    lastName: string;
    nationalId: string | null;
  };
};
