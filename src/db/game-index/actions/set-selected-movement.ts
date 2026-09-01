import "server-only";

import { getDb } from "@/db/game-index";
import { games } from "@/db/game-index/schema";
import { eq } from "drizzle-orm";
import {
  SelectedMovement,
  serializeSelectedMovement,
} from "@/model/selected-movement";

/**
 * Persist the director's chosen movement on the game row as JSON text. This
 * overwrites any previous selection, so re-selecting is idempotent and does not
 * materialize boards/assignments — that happens only when the game is started.
 */
export async function setSelectedMovement(
  gameId: string,
  selected: SelectedMovement,
) {
  const db = getDb();
  await db
    .update(games)
    .set({ selectedMovement: serializeSelectedMovement(selected) })
    .where(eq(games.gameId, gameId));
}
