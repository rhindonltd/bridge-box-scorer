"use client";

import SimpleCreateGameForm from "@/components/create/SimpleCreateGameForm";
import { useState } from "react";

export function CreateGamePage() {
  const [gameId, setGameId] = useState<number | null>(null);

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

      {gameId === null ? (
        <SimpleCreateGameForm onGameCreated={(id: number) => setGameId(id)} />
      ) : (
        <></>
      )}
    </div>
  );
}
