import React from "react";
import { Leaderboard } from "@/components/results/leaderboard/Leaderboard";
import { OverallScoreAndParticipant } from "@/model/leaderboard";
import { GameInfo } from "@/components/common/GameInfo";

interface Props {
  overallScoreAndParticipant: OverallScoreAndParticipant;
  onNext: () => void;
}

export function LeaderboardPage({ overallScoreAndParticipant, onNext }: Props) {
  return (
    <div className="h-dvh flex flex-col bg-gray-100">
      <div className="flex flex-row w-full">
        <GameInfo />
      </div>

      <div className="w-full">
        <div className="flex flex-col bg-blue-100 text-blue-900 py-2">
          <div className="text-center font-bold">Results</div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Leaderboard overallScoreAndParticipant={overallScoreAndParticipant} />
      </div>

      <div className="p-2">
        <button
          onClick={onNext}
          className="w-full py-3 text-lg font-bold bg-blue-600 text-white rounded-lg mt-4 hover:bg-blue-700 active:scale-[0.98] transition"
        >
          {"Close"}
        </button>
      </div>
    </div>
  );
}
