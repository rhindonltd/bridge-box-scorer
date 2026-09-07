import "server-only";

import { getDb } from "@/db/game-index";
import { and, gte } from "drizzle-orm";
import { BridgeGame, games } from "../schema";
import { isGameCompleted } from "./is-game-completed";

export async function findJoinableGames(): Promise<BridgeGame[]> {
  // eventDate is stored as a date-only string ("YYYY-MM-DD"), so compare
  // against today's local date in the same format.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const db = await getDb();

  const candidates = await db
    .select()
    .from(games)
    .where(and(gte(games.eventDate, today)));

  // Exclude games that are already completed — there is nothing left to join.
  const completed = await Promise.all(
    candidates.map((game) => isGameCompleted(game.gameId)),
  );

  return candidates.filter((_, index) => !completed[index]);
}
