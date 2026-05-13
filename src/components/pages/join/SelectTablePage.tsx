"use client";

import { SectionInfo } from "@/components/common/SectionInfo";
import SelectTable from "@/components/join/SelectTable";
import { useGame } from "@/context/GameContext";

type Assignment = {
  table: number;
  direction: "NS" | "EW";
};

interface Props {
  selectTable: (table: number, direction: "NS" | "EW") => void;
  assigned: Assignment[];
}

export function SelectTablePage({ selectTable, assigned }: Props) {
  const { gameSelection } = useGame();

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="w-full">
        <SectionInfo />
      </div>

      <SelectTable
        tables={gameSelection!.tables}
        selectTable={selectTable}
        assigned={assigned}
      />
    </div>
  );
}
