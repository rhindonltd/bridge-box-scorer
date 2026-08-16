import { getDb } from "@/db/games";
import { or, eq } from "drizzle-orm";
import {
  Participant,
  participants,
} from "@/db/games/tables/participants";

export async function findPairForPlayerId(
  gameId: string,
  playerId: number,
): Promise<Participant | null> {
  const db = await getDb(gameId);

  const results = await db
    .select()
    .from(participants)
    .where(
      or(
        eq(participants.player1, playerId),
        eq(participants.player2, playerId),
      ),
    );

  if (!results) {
    return null;
  }

  return results[0];
}
