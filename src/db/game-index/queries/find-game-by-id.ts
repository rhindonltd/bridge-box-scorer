import "server-only";

import { getDb } from "@/db/game-index";
import { BridgeGame } from "../schema";

export async function findGameById(gameId: string): Promise<BridgeGame | null> {
  const db = getDb();

  const game = await db.query.games.findFirst({
    where: (games, { eq }) => eq(games.gameId, gameId),
  });

  return game ?? null;
}
