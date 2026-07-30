"use client";

import { useGame } from "@/context/GameContext";

export function GameInfo() {
  const { game } = useGame();

  if (!game) return null;

  return (
    <div className="flex flex-col bg-blue-100 text-blue-900 py-2 flex-1">
      <div className="text-center font-bold">
        <span>{game.eventName}</span>
      </div>

      {(game.sessionName || game.sectionName) && (
        <div className="text-center font-bold">
          {game.sessionName && <span>{game.sessionName}</span>}
          {game.sessionName && game.sectionName && <span>, </span>}
          {game.sectionName && <span>{game.sectionName}</span>}
        </div>
      )}
    </div>
  );
}
