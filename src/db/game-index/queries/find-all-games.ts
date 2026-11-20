import "server-only";
import { getDb } from "@/db/game-index";
import { isGameStarted } from "@/db/games/queries/is-game-started";
import { BridgeGame, games } from "../schema";
import { desc, isNull } from "drizzle-orm";

/** Open (not finalised) games, most recently created first. */
async function findOpenGames(): Promise<BridgeGame[]> {
  const db = getDb();
  return db
    .select()
    .from(games)
    .where(isNull(games.finalisedAt))
    .orderBy(desc(games.createdAt));
}

/** Open games split by whether they have started (boards materialised). */
async function openGamesByStarted(wantStarted: boolean): Promise<BridgeGame[]> {
  const open = await findOpenGames();
  const started = await Promise.all(open.map((g) => isGameStarted(g.gameId)));
  return open.filter((_, i) => started[i] === wantStarted);
}

/**
 * Started, not finalised games, most recently created first. Feeds the
 * "Manage Game" list: games still being set up are listed under "Create Game"
 * instead, and finalised games under "Export Game".
 */
export async function findAllGames(): Promise<BridgeGame[]> {
  return openGamesByStarted(true);
}

/**
 * Games that have been created but not started yet, most recently created
 * first. Feeds the "Create Game" screen, so a director can carry on setting
 * one up.
 */
export async function findNotStartedGames(): Promise<BridgeGame[]> {
  return openGamesByStarted(false);
}
