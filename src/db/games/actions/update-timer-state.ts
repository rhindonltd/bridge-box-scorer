"use server";

import { getDb } from "@/db/games";
import { TimerState } from "@/timer/timer-state";
import { metadata } from "@/db/games/tables/metadata";

export async function updateTimerState(gameId: string, timerState: TimerState) {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  await db
    .insert(metadata)
    .values({
      key: "timer",
      value: JSON.stringify(timerState),
    })
    .onConflictDoUpdate({
      target: metadata.key,
      set: {
        value: JSON.stringify(timerState),
      },
    });
}
