import { SectionInfo } from "@/components/common/SectionInfo";
import React from "react";
import { Leaderboard } from "@/components/results/leaderboard/Leaderboard";
import { OverallScore } from "@/model/leaderboard";

interface Props {
  eventName: string;
  sessionName?: string;
  sectionName?: string;
  overallScore: OverallScore;
  onNext: () => void;
}

export function LeaderboardPage({
  eventName,
  sessionName,
  sectionName,
  overallScore,
  onNext,
}: Props) {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="w-full">
        <SectionInfo
          eventName={eventName}
          sessionName={sessionName}
          sectionName={sectionName}
        />
      </div>

      <div className="w-full">
        <div className="flex flex-col bg-blue-300 py-2">
          <div className="text-center font-bold">Results</div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Leaderboard overallScore={overallScore} />
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
