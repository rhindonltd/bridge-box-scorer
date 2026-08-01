import React from "react";
import { Traveller } from "@/components/results/traveller/Traveller";
import { ScoredTraveller } from "@/scoring/traveller/score-traveller";
import { PlayHeader } from "@/components/play/PlayHeader";

interface Props {
  board: number;
  lastBoardOfRound: boolean;
  scoredTraveller: ScoredTraveller;
  onNext: () => void;
}

export function BoardResultsPage({
  board,
  lastBoardOfRound,
  scoredTraveller,
  onNext,
}: Props) {
  return (
    <div className="flex-1 flex flex-col">
      <PlayHeader detail={`Board ${board}`} />

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
