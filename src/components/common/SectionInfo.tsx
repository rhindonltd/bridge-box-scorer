"use client";

import { useGame } from "@/context/GameContext";

export function SectionInfo() {
  const { gameSelection } = useGame();

  // 👇 render nothing if no selection
  if (!gameSelection) return null;

  return (
      <div className="flex flex-row w-full">
        <div className="flex flex-col bg-blue-200 py-2 flex-1">
          <div className="text-center font-bold">
            <span>{gameSelection.eventName}</span>
          </div>

          {(gameSelection.sessionName || gameSelection.sectionName) && (
            <div className="text-center font-bold">
              {gameSelection.sessionName && <span>{gameSelection.sessionName}</span>}
              {gameSelection.sessionName && gameSelection.sectionName && <span>, </span>}
              {gameSelection.sectionName && <span>{gameSelection.sectionName}</span>}
            </div>
          )}
        </div>
          <div className="flex flex-col bg-blue-400 py-2">
              <span className="text-center font-bold px-4">Pair</span>
              <span className="text-center font-bold px-4 text-xl">1</span>
          </div>
      </div>
  );
}
