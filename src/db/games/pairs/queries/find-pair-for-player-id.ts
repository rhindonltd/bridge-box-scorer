import { getDb } from "@/db/games";
import { or, eq } from "drizzle-orm";
import { pairs } from "../tables/pairs";

export async function findPairForPlayerId(
  gameId: string,
  playerId: number,
): Promise<number | null> {
  const db = await getDb(gameId);

  const results = await db
    .select({ id: pairs.id })
    .from(pairs)
    .where(or(eq(pairs.player1, playerId), eq(pairs.player2, playerId)));

  if (!results) {
    return null;
  }

  return results[0].id;
}
