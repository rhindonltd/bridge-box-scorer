import React from "react";
import { SectionInfo } from "@/components/common/SectionInfo";
import { TableRoundPairBoardInfo } from "@/components/common/TableRoundPairBoardInfo";
import EnterPairPlayerNames from "@/components/join/EnterPairPlayerNames";
import { PairSeat } from "@/model/participants";

interface Props {
  seat: PairSeat;
  onSubmitPair: () => void;
}

export function EnterPairPlayerNamesPage({ seat, onSubmitPair }: Props) {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header / Section info */}
      <div className="w-full">
        <SectionInfo />
      </div>

      <div className="w-full">
        <TableRoundPairBoardInfo table={seat.tableNumber} />
      </div>

      {/* Main content: vertically center EnterPlayerNames */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        <EnterPairPlayerNames
          direction={seat.direction}
          onSubmitPair={onSubmitPair}
        />
      </div>
    </div>
  );
}
