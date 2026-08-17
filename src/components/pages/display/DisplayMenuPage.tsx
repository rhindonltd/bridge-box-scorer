"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { useGame } from "@/context/GameContext";
import { Clock, Monitor } from "lucide-react";

export interface DisplayMenuPageProps {
  onTimerClick: () => void;
  onLeaderboardClick: () => void;
}

export function DisplayMenuPage({
  onTimerClick,
  onLeaderboardClick,
}: DisplayMenuPageProps) {
  const { game, isLoading } = useGame();

  if (isLoading || !game) return null;

    const standardButtonClass =
        "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 pl-4";

  return (
    <GamePageLayout
      headerTitle="Display Menu"
      children={
          <div className="flex flex-col gap-3 px-6 pb-8 pt-6 max-w-sm w-full mx-auto">
          <button onClick={onTimerClick} className={standardButtonClass}>
                <span className="flex items-center gap-3">Timer</span>
          </button>

          <button onClick={onLeaderboardClick} className={standardButtonClass}>
                <span className="flex items-center gap-3">Leaderboard</span>
          </button>
          </div>
      }
    />
  );
}
