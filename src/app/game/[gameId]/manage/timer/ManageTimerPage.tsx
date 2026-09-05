"use client";

import { useRequiredGame } from "@/context/GameContext";
import { useGameStarted } from "@/hooks/game-started";
import { TimerManager } from "./TimerSetup";

/**
 * Standalone /manage/timer route. Before the game has started this shows the
 * configuration screen; once it is in progress it shows the live timer
 * controls.
 */
export default function ManageTimerPage() {
  const { game } = useRequiredGame();
  const { started } = useGameStarted(game.gameId);

  return <TimerManager started={started} />;
}
