import { TimerState } from "@/timer/timer-state";
import { getDb } from "@/db/games";
import { metadata } from "@/db/games/tables/metadata";
import { eq } from "drizzle-orm";

export async function findTimerState(
  gameId: string,
): Promise<TimerState | null> {
  const db = await getDb(gameId);

  const timers = await db
    .select()
    .from(metadata)
    .where(eq(metadata.key, "timer"));

  return timers.length == 1 ? JSON.parse(timers[0].value) : null;
}
