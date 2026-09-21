import "server-only";

import { requireGameDb } from "@/db/games";
import { NewPlayer, Player, players } from "@/db/games/tables/players";

export async function createPlayer(
  gameId: string,
  item: NewPlayer,
): Promise<Player> {
  const db = await requireGameDb(gameId);

  const result = await db.insert(players).values(item).returning();
  return result[0];
}
