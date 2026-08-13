"use client";

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
    "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
        {game.eventName}
      </div>

      <button onClick={onTimerClick} className={standardButtonClass}>
        <span className="flex items-center gap-3">
          <Clock size={20} />
          Timer
        </span>
      </button>

      <button onClick={onLeaderboardClick} className={standardButtonClass}>
        <span className="flex items-center gap-3">
          <Monitor size={20} />
          Leaderboard
        </span>
      </button>
    </div>
  );
}
