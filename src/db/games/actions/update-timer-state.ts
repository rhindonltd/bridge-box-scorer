import "server-only";

import { getDb } from "@/db/games";
import { TimerState } from "@/timer/timer-state";
import { metadata } from "@/db/games/tables/metadata";
import { SectionLetter } from "@/model/participants";
import { timerKey } from "@/db/games/queries/find-timer-state";

/**
 * Persist a single section's timer state, keyed by `timer:{section}` in the
 * game's metadata. Upserts so re-saving overwrites the section's config/state.
 */
export async function updateTimerState(
  gameId: string,
  section: SectionLetter,
  timerState: TimerState,
) {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  await db
    .insert(metadata)
    .values({
      key: timerKey(section),
      value: JSON.stringify(timerState),
    })
    .onConflictDoUpdate({
      target: metadata.key,
      set: {
        value: JSON.stringify(timerState),
      },
    });
}
