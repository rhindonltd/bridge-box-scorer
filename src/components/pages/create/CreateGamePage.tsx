"use client";

import SimpleCreateGameForm from "@/components/create/SimpleCreateGameForm";
import ShowTables, { Table } from "@/components/tables/ShowTables";
import { useState } from "react";
import { getSocket } from "@/lib/socket";
import { NewBridgeGame } from "@/db/game-index/schema";

export function CreateGamePage() {
  const [gameId, setGameId] = useState<number | null>(null);

  function createGame(game: NewBridgeGame) {
    getSocket().emit("game:create", game, (response: { gameId: any }) => {
      console.log("created game:", response.gameId);
      setGameId(response.gameId);
    });
  }

  function createTables(count: number): Table[] {
    return Array.from({ length: count }, (_, i) => ({
      tableNumber: i + 1,
      players: {
        N: null,
        S: null,
        E: null,
        W: null,
      },
    }));
  }

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
        <SimpleCreateGameForm onCreateGame={createGame} />
      ) : (
        <ShowTables tables={createTables(10)} />
      )}
    </div>
  );
}
