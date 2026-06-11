"use client";

import { useGame } from "@/context/GameContext";
import { getSocket } from "@/lib/socket";

export default function ControlsPage() {
  const { gameSelection } = useGame();

  if (!gameSelection) {
    return null;
  }

  /* ---------------- SOCKET ---------------- */

  function emit(event: string) {
    getSocket().emit(event, {
      gameType: gameSelection!.gameType,
      gameId: gameSelection!.gameId,
    });
  }

  /* ---------------- CONTROLS ---------------- */

  return (
    <div className="h-screen w-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold mb-6">🎛️ Director Controls</h1>

      {/* PRIMARY CONTROLS */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <button
          onClick={() => emit("timer:create")}
          className="bg-cyan-600 py-6 rounded-xl text-xl font-semibold"
        >
          Create
        </button>

        <button
          onClick={() => emit("timer:start")}
          className="bg-green-600 py-6 rounded-xl text-xl font-semibold"
        >
          Start
        </button>

        <button
          onClick={() => emit("timer:pause")}
          className="bg-yellow-600 py-6 rounded-xl text-xl font-semibold"
        >
          Pause
        </button>

        <button
          onClick={() => emit("timer:reset")}
          className="bg-blue-600 py-6 rounded-xl text-xl font-semibold"
        >
          Reset
        </button>

        <button
          onClick={() => emit("timer:next-phase")}
          className="bg-purple-600 py-6 rounded-xl text-xl font-semibold"
        >
          Next Phase
        </button>

        <button
          onClick={() => emit("timer:skip-round")}
          className="bg-red-600 py-6 rounded-xl text-xl font-semibold col-span-2"
        >
          Skip Round
        </button>
      </div>

      {/* SAFETY LABEL */}
      <div className="text-white/40 text-sm mt-6">
        Game ID: {gameSelection.gameId}
      </div>
    </div>
  );
}
