import { GameType } from "@/db/games/types/game-type";
import { TimerState } from "@/timer/timer-state";
import { getDb as individualDb } from "@/db/games/individual";
import { getDb as pairDb } from "@/db/games/pairs";
import { metadata } from "../tables/metadata";
import { eq } from "drizzle-orm";

export async function findTimerState(
  gameType: GameType,
  gameId: string,
): Promise<TimerState | null> {
  const db = await (gameType == "INDIVIDUAL"
    ? individualDb(gameId)
    : pairDb(gameId));

  const timers = await db
    .select()
    .from(metadata)
    .where(eq(metadata.key, "timer"));

  return timers.length == 1 ? JSON.parse(timers[0].value) : null;
}
