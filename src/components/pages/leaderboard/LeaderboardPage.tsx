import React from "react";
import { Leaderboard } from "@/components/results/leaderboard/Leaderboard";
import { OverallScoreAndParticipant } from "@/model/leaderboard";
import { GamePageLayout } from "@/components/layout/GamePageLayout";

interface Props {
  overallScoreAndParticipant: OverallScoreAndParticipant;
  onNext: () => void;
}

export function LeaderboardPage({ overallScoreAndParticipant, onNext }: Props) {
  return (
    <GamePageLayout
      headerTitle="Leaderboard"
      children={
        <Leaderboard overallScoreAndParticipant={overallScoreAndParticipant} />
      }
      actions={
        <button
          onClick={onNext}
          className="w-full py-3 text-lg font-bold bg-blue-600 text-white rounded-lg mt-4 hover:bg-blue-700 active:scale-[0.98] transition"
        >
          Close
        </button>
      }
    />
  );
}
