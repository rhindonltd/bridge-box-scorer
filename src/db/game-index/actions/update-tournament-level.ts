import "server-only";

import { getDb } from "@/db/game-index";
import { games } from "@/db/game-index/schema";
import { TournamentLevel } from "@/db/games/types/tournament-level";
import { eq } from "drizzle-orm";

/**
 * Update a game's EBU tournament level (the choice that fixes the USEBIO
 * masterpoint/charge EVENT fields on export). Lets a director correct a level
 * set wrongly at creation, any time before the results are submitted.
 */
export async function updateTournamentLevel(
  gameId: string,
  tournamentLevel: TournamentLevel,
) {
  const db = getDb();
  await db
    .update(games)
    .set({ tournamentLevel })
    .where(eq(games.gameId, gameId));
}
