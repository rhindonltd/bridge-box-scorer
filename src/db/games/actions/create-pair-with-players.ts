import "server-only";

import { getDb } from "@/db/games";
import { NewPlayer, players } from "@/db/games/tables/players";
import { participants } from "@/db/games/tables/participants";
import { PairSeat } from "@/model/participants";

/**
 * Create a seated pair and its two player rows in a single transaction, so a
 * failure to insert the participant row can never leave the two player rows
 * orphaned. Returns nothing; the caller already holds the seat's secret key.
 */
export async function createPairWithPlayers(
  gameId: string,
  data: {
    initialSeat: PairSeat;
    player1: NewPlayer;
    player2: NewPlayer;
    secretKey: string;
  },
): Promise<void> {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  db.transaction((tx) => {
    const p1 = tx.insert(players).values(data.player1).returning().get();
    const p2 = tx.insert(players).values(data.player2).returning().get();

    tx.insert(participants)
      .values({
        initialSeat: data.initialSeat,
        player1: p1.id,
        player2: p2.id,
        secretKey: data.secretKey,
      })
      .run();
  });
}
