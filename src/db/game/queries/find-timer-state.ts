import { GameType } from "@/db/game/types/game-type";
import { TimerState } from "@/timer/timer-state";
import { getDb as pairDb } from "@/db/game";
import { metadata } from "@/db/game/tables/metadata";
import { eq } from "drizzle-orm";

export async function findTimerState(
  gameType: GameType,
  gameId: string,
): Promise<TimerState | null> {
  const db = await pairDb(gameId);

  const timers = await db
    .select()
    .from(metadata)
    .where(eq(metadata.key, "timer"));

  return timers.length == 1 ? JSON.parse(timers[0].value) : null;
}
