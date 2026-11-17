import "server-only";
import { getDb } from "@/db/game-index";
import { BridgeGame, games } from "../schema";
import { desc, isNotNull } from "drizzle-orm";

/** Finalised games, most recently finalised first. Feeds "Export Game". */
export async function findFinalisedGames(): Promise<BridgeGame[]> {
  const db = getDb();
  return db
    .select()
    .from(games)
    .where(isNotNull(games.finalisedAt))
    .orderBy(desc(games.finalisedAt));
}
