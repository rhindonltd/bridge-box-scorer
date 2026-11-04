import "server-only";

import { findGameById } from "@/db/game-index/queries/find-game-by-id";

/**
 * Whether a game is a TEAMS event (as opposed to PAIRS). Decided purely by the
 * game's `gameType` — Swiss Teams and ordinary Teams are both `TEAMS`.
 *
 * A game that can't be found is treated as not-teams: the callers go on to
 * touch the per-game database, which reports the missing game itself, so this
 * helper never needs to throw.
 */
export async function isTeamsGame(gameId: string): Promise<boolean> {
  const game = await findGameById(gameId);
  return game?.gameType === "TEAMS";
}
