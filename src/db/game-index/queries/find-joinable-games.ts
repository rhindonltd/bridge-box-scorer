import "server-only";

import { getDb } from "@/db/game-index";
import { and, gte } from "drizzle-orm";
import { BridgeGame, games } from "../schema";

export async function findJoinableGames(): Promise<BridgeGame[]> {
  // eventDate is stored as a date-only string ("YYYY-MM-DD"), so compare
  // against today's local date in the same format.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const db = await getDb();

  return db
    .select()
    .from(games)
    .where(and(gte(games.eventDate, today)));
}
