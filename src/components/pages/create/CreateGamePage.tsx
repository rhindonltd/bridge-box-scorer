"use client";

import { useGame } from "@/context/GameContext";
import { ShowTablesPage } from "./ShowTablesPage";
import { CreateGameFormPage } from "./CreateGameFormPage";

export function CreateGamePage() {
  const { gameSelection } = useGame();

  return (
    <div className="h-screen flex flex-col overflow-y-auto relative">
      <div className="w-full">
        <div className="flex flex-row w-full">
          <div className="flex flex-col bg-blue-200 py-2 flex-1">
            <div className="text-center font-bold">
              <span>Create Game</span>
            </div>
          </div>
        </div>
      </div>

      {gameSelection === null ? <CreateGameFormPage /> : <ShowTablesPage />}
    </div>
  );
}
