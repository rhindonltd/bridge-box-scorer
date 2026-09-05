import { TimerState } from "@/timer/timer-state";
import { getDb } from "@/db/games";
import { metadata } from "@/db/games/tables/metadata";
import { SectionLetter } from "@/model/participants";
import { eq, like } from "drizzle-orm";

/** The metadata key under which a section's timer state is stored. */
export function timerKey(section: SectionLetter): string {
  return `timer:${section}`;
}

/** Prefix matching every section's timer key. */
const TIMER_KEY_PREFIX = "timer:";

/**
 * Read a single section's timer state, or `null` when none has been saved for
 * that section.
 */
export async function findTimerState(
  gameId: string,
  section: SectionLetter,
): Promise<TimerState | null> {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  const timers = await db
    .select()
    .from(metadata)
    .where(eq(metadata.key, timerKey(section)));

  return timers.length == 1 ? JSON.parse(timers[0].value) : null;
}

/**
 * Read every section's timer state for a game, keyed by section letter. Used
 * by the game-start promotion fan-out to start each configured section.
 */
export async function findAllTimerStates(
  gameId: string,
): Promise<Map<SectionLetter, TimerState>> {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  const rows = await db
    .select()
    .from(metadata)
    .where(like(metadata.key, `${TIMER_KEY_PREFIX}%`));

  const bySection = new Map<SectionLetter, TimerState>();
  for (const row of rows) {
    const section = row.key.slice(TIMER_KEY_PREFIX.length);
    bySection.set(section, JSON.parse(row.value));
  }
  return bySection;
}
