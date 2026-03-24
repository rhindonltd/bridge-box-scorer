import { SectionInfo } from "@/components/common/SectionInfo";
import { TableRoundPairBoardInfo } from "@/components/common/TableRoundPairBoardInfo";
import React from "react";
import { ScoredTraveller } from "@/model/scored-traveller";
import { Traveller } from "@/components/results/traveller/Traveller";

interface Props {
  eventName: string;
  sessionName?: string;
  sectionName?: string;
  board: number;
  lastBoardOfRound: boolean;
  scoredTraveller: ScoredTraveller;
  onNext: () => void;
}

export function BoardResultsPage({
  eventName,
  sessionName,
  sectionName,
  board,
  lastBoardOfRound,
  scoredTraveller,
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
        <TableRoundPairBoardInfo board={board} />
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
