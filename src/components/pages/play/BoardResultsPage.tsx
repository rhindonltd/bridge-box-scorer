import React from "react";
import { Traveller } from "@/components/results/traveller/Traveller";
import { ScoredTraveller } from "@/scoring/traveller/score-traveller";
import { PlayHeader } from "@/components/play/PlayHeader";

interface Props {
  board: number;
  playedBoards: number[];
  lastBoardOfRound: boolean;
  scoredTraveller: ScoredTraveller;
  onBoardSelected: (board: number) => void;
  onNext: () => void;
}

export function BoardResultsPage({
  board,
  playedBoards,
  lastBoardOfRound,
  scoredTraveller,
  onBoardSelected,
  onNext,
}: Props) {
  return (
    <div className="flex-1 flex flex-col">
      <PlayHeader detail={`Board ${board}`} />

      {/* Board selector tabs */}
      {playedBoards.length > 1 && (
        <div className="flex gap-2 px-3 py-2 bg-gray-100 overflow-x-auto shrink-0">
          {playedBoards.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => onBoardSelected(b)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition shrink-0 ${
                b === board
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        <Traveller scoredTraveller={scoredTraveller} />
      </div>

      <div className="p-2 shrink-0">
        <button
          onClick={onNext}
          className="w-full py-3 text-lg font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {lastBoardOfRound ? "Next Round" : "Next Board"}
        </button>
      </div>
    </div>
  );
}
