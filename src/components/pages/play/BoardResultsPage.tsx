import React from "react";
import { Traveller } from "@/components/results/traveller/Traveller";
import { ScoredTraveller } from "@/scoring/traveller/score-traveller";
import { GameInfo } from "@/components/common/GameInfo";
import { ParticipantInfo } from "@/components/common/ParticipantInfo";

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
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="flex flex-row w-full">
        <GameInfo />
        <ParticipantInfo />
      </div>

      <div className="w-full">
        <div className="flex flex-col bg-blue-300 py-2">
          <div className="text-center font-bold">
            <span>Board {board}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Traveller scoredTraveller={scoredTraveller} />
      </div>

      <div className="p-2">
        <button
          onClick={onNext}
          className="w-full py-3 text-lg font-bold bg-blue-600 text-white rounded-lg mt-4 hover:bg-blue-700 active:scale-[0.98] transition"
        >
          {lastBoardOfRound ? "Next Round" : "Next Board"}
        </button>
      </div>
    </div>
  );
}
