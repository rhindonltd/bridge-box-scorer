import { Db } from "@/db/games";
import { players } from "@/db/games/tables/players";
import { eq, sql } from "drizzle-orm";
import { participants } from "@/db/games/tables/participants";
import { alias } from "drizzle-orm/sqlite-core";
import { Pair } from "@/model/participants";

export async function findPairs(db: Db): Promise<Pair[]> {
  const player1 = alias(players, "player1");
  const player2 = alias(players, "player2");

  return await db
    .select({
      initialSeat: participants.initialSeat,
      type: sql<"PAIR">`'PAIR'`,
      player1: {
        id: player1.id,
        firstName: player1.firstName,
        lastName: player1.lastName,
        nationalId: player1.nationalId,
      },
      player2: {
        id: player2.id,
        firstName: player2.firstName,
        lastName: player2.lastName,
        nationalId: player2.nationalId,
      },
    })
    .from(participants)
    .innerJoin(player1, eq(participants.player1, player1.id))
    .innerJoin(player2, eq(participants.player2, player2.id));
}
