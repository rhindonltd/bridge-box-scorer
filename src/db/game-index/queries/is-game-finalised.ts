import "server-only";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";

/** Whether the director has finalised the game (it is then read-only). */
export async function isGameFinalised(gameId: string): Promise<boolean> {
  const game = await findGameById(gameId);
  return !!game?.finalisedAt;
}
