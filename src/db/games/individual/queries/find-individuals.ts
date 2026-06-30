"use server";

import { getDb } from "@/db/games/individual";
import { players } from "@/db/games/shared/tables/players";
import { eq, sql } from "drizzle-orm";
import { participants } from "@/db/games/individual/tables/participants";
import { Individual } from "@/model/participants";

export async function findIndividuals(gameId: string): Promise<Individual[]> {
  const db = await getDb(gameId);

  return db
    .select({
      type: sql<"INDIVIDUAL">`'INDIVIDUAL'`,
      initialSeat: participants.initialSeat,
      player: {
        id: players.id,
        firstName: players.firstName,
        lastName: players.lastName,
        nationalId: players.nationalId,
      },
    })
    .from(participants)
    .innerJoin(players, eq(participants.player, players.id));
}
