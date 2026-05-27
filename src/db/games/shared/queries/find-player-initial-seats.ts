"use server";

import { getDb } from "@/db/games/individual";
import { players } from "@/db/games/shared/tables/players";
import { initialSeat } from "@/db/games/shared/tables/initial-seat";
import { Direction } from "@/model/common";
import { eq } from "drizzle-orm";

export async function findPlayerInitialSeats(
  gameId: string,
): Promise<PlayerInitialSeat[]> {
  const db = await getDb(gameId);

  return db
    .select({
      tableNumber: initialSeat.tableNumber,
      direction: initialSeat.direction,
      player: {
        id: players.id,
        firstName: players.firstName,
        lastName: players.lastName,
        nationalId: players.nationalId,
      },
    })
    .from(initialSeat)
    .innerJoin(players, eq(initialSeat.player, players.id));
}

export type PlayerInitialSeat = {
  tableNumber: number;
  direction: Direction;
  player: {
    firstName: string;
    lastName: string;
    nationalId: string | null;
  };
};
