"use client";

import { Check } from "lucide-react";

type Props = {
  boards: number[];
  playedBoards: number[];
  onBoardSelected: (board: number) => void;
};

export function StepBoard({ boards, playedBoards, onBoardSelected }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="grid grid-cols-3 gap-4 max-w-xs w-full">
        {boards.map((board) => {
          const isPlayed = playedBoards.includes(board);
          return (
            <button
              key={board}
              type="button"
              disabled={isPlayed}
              data-testid={`wizard-board-${board}`}
              // The tick is decorative, so say "played" for screen readers.
              aria-label={isPlayed ? `${board} (played)` : undefined}
              // White tiles, like the wizard's other choice steps (suit,
              // result). A played board is a grey tile with a tick, so it
              // still stands out without colour.
              className={`relative text-2xl font-bold py-6 rounded-xl border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isPlayed
                  ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50 active:scale-[0.98]"
              }`}
              onClick={() => onBoardSelected(board)}
            >
              {board}
              {isPlayed && (
                <Check
                  aria-hidden="true"
                  size={18}
                  strokeWidth={3}
                  className="absolute top-2 right-2 text-gray-500"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
