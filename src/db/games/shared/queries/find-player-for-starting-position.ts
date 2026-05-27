import { initialSeat } from "../tables/initial-seat";
import { getDb as individualDb } from "@/db/games/individual";
import { getDb as pairDb } from "@/db/games/pairs";
import { and, eq } from "drizzle-orm";
import { Direction } from "@/model/common";
import { players } from "@/db/games/shared/tables/players";
import { GameType } from "@/db/games/types/game-type";

export async function findPlayerForStartingPosition(
  gameType: GameType,
  gameId: string,
  tableNumber: number,
  direction: Direction,
): Promise<number | null> {
  const db = await (gameType == "INDIVIDUAL"
    ? individualDb(gameId)
    : pairDb(gameId));

  const results = await db
    .select({
      player: {
        id: players.id,
      },
    })
    .from(initialSeat)
    .where(
      and(
        eq(initialSeat.tableNumber, tableNumber),
        eq(initialSeat.direction, direction),
      ),
    )
    .leftJoin(players, eq(initialSeat.player, players.id));

  if (!results) {
    return null;
  }

  return results[0]?.player?.id ?? null;
}
