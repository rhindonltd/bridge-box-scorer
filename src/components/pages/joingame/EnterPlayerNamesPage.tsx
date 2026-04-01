import React from "react";
import EnterPlayerNames from "@/components/player/lobby/EnterPlayerNames";
import { SectionInfo } from "@/components/common/SectionInfo";
import { TableRoundPairBoardInfo } from "@/components/common/TableRoundPairBoardInfo";

interface Props {
  eventName: string;
  sessionName?: string;
  sectionName?: string;
  table: number;
  direction: "NS" | "EW";
  submitPlayerNames: (player1: string, player2: string) => void;
}

export function EnterPlayerNamesPage({
  eventName,
  sessionName,
  sectionName,
  table,
  direction,
  submitPlayerNames,
}: Props) {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header / Section info */}
      <div className="w-full">
        <SectionInfo
          eventName={eventName}
          sessionName={sessionName}
          sectionName={sectionName}
        />
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
