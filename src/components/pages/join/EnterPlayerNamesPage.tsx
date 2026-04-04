import React from "react";
import { SectionInfo } from "@/components/common/SectionInfo";
import { TableRoundPairBoardInfo } from "@/components/common/TableRoundPairBoardInfo";
import EnterPlayerNames from "@/components/join/EnterPlayerNames";

interface Props {
  table: number;
  direction: "NS" | "EW";
  submitPlayerNames: (player1: string, player2: string) => void;
}

export function EnterPlayerNamesPage({
  table,
  direction,
  submitPlayerNames,
}: Props) {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header / Section info */}
      <div className="w-full">
        <SectionInfo />
      </div>

      <div className="w-full">
        <TableRoundPairBoardInfo table={table} />
      </div>

      {/* Main content: vertically center EnterPlayerNames */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        <EnterPlayerNames
          direction={direction}
          submitPlayerNames={submitPlayerNames}
        />
      </div>
    </div>
  );
}
