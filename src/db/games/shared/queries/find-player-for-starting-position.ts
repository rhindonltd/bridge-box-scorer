import { startingpositions } from "../tables/starting-positions";
import { getDb } from "@/db/games";
import { and, eq } from "drizzle-orm";
import { Direction } from "@/model/common";
import { players } from "@/db/games/shared/tables/players";

export async function findPlayerForStartingPosition(
  gameId: string,
  tableNumber: number,
  direction: Direction,
): Promise<number | null> {
  const db = await getDb(gameId);

  const results = await db
    .select({
      player: {
        id: players.id,
      },
    })
    .from(startingpositions)
    .where(
      and(
        eq(startingpositions.tableNumber, tableNumber),
        eq(startingpositions.direction, direction),
      ),
    )
    .leftJoin(players, eq(startingpositions.player, players.id));

  if (!results) {
    return null;
  }

  return results[0]?.player?.id ?? null;
}
