"use server";

import { getDb as individualDb } from "@/db/games/individual";
import { getDb as pairDb } from "@/db/games/pairs";
import { GameType } from "@/db/games/types/game-type";
import { TimerState } from "@/timer/timer-state";
import { metadata } from "@/db/games/shared/tables/metadata";

export async function updateTimerState(
  gameType: GameType,
  gameId: string,
  timerState: TimerState,
) {
  const db = await (gameType == "INDIVIDUAL"
    ? individualDb(gameId)
    : pairDb(gameId));

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
