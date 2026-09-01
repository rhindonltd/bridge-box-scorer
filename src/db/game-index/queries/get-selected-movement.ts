import "server-only";

import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import {
  SelectedMovement,
  parseSelectedMovement,
} from "@/model/selected-movement";

/**
 * Read the game's persisted movement selection as a typed SelectedMovement,
 * or null if no (valid) movement has been selected yet.
 */
export async function getSelectedMovement(
  gameId: string,
): Promise<SelectedMovement | null> {
  const game = await findGameById(gameId);

  if (!game) {
    return null;
  }

  return parseSelectedMovement(game.selectedMovement);
}
