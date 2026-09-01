import "server-only";

import { getDb } from "@/db/game-index";
import { and, eq, gte } from "drizzle-orm";
import { BridgeGame, games } from "../schema";

export async function findJoinableGames(): Promise<BridgeGame[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const db = await getDb();

  return db
    .select()
    .from(games)
    .where(and(gte(games.eventDate, today.toISOString())));
}
