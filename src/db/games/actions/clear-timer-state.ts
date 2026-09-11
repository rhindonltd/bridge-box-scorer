import "server-only";

import { getDb } from "@/db/games";
import { metadata } from "@/db/games/tables/metadata";
import { eq } from "drizzle-orm";
import { SectionLetter } from "@/model/participants";
import { timerKey } from "@/db/games/queries/find-timer-state";

/**
 * Remove a single section's persisted timer state (the `timer:{section}`
 * metadata row). A no-op when no timer has been saved for that section.
 *
 * Used when the section's movement changes: the timer's round structure is
 * derived from the movement (rounds, boards per round), so an existing config
 * is stale and must be dropped rather than silently kept against the wrong
 * movement.
 */
export async function clearTimerState(
  gameId: string,
  section: SectionLetter,
): Promise<void> {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  await db.delete(metadata).where(eq(metadata.key, timerKey(section)));
}
