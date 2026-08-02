"use client";

import { useRouter } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { Monitor, Clock } from "lucide-react";

export default function DisplayMenu() {
  const { game, isLoading } = useGame();
  const router = useRouter();

  if (isLoading || !game) {
    return null;
  }

  function showTimer() {
    router.push(`/display/${game!.gameId}/timer`);
  }

  function showLeaderboard() {
    router.push(`/display/${game!.gameId}/leaderboard`);
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
        {game.eventName}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Room Display</h1>
        <p className="text-base text-gray-600 mb-8 text-center">
          Choose what to show on the big screen
        </p>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button
            onClick={showTimer}
            className="w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <span className="flex items-center justify-center gap-3">
              <Clock size={20} />
              Show Timer
            </span>
          </button>

          <button
            onClick={showLeaderboard}
            className="w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <span className="flex items-center justify-center gap-3">
              <Monitor size={20} />
              Show Leaderboard
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
