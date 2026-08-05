"use client";

import { useState } from "react";
import { ContractSuit, Doubling, Doublings, Level } from "@/model/contract";
import { Direction, Directions, SuitMap } from "@/model/common";

type Props = {
  level: Level;
  suit: ContractSuit;
  onDeclarerSelected: (declarer: Direction, dbl: Doubling) => void;
};

const doublingLabels: Record<Doubling, string> = {
  "": "None",
  X: "X",
  XX: "XX",
};

const suitSymbolColor: Record<ContractSuit, string> = {
  C: "text-gray-900",
  D: "text-red-600",
  H: "text-red-600",
  S: "text-gray-900",
  NT: "text-gray-900",
};

export function StepDeclarer({ level, suit, onDeclarerSelected }: Props) {
  const [doubling, setDoubling] = useState<Doubling>("");

  return (
    <div className="flex-1 flex flex-col p-4 min-h-0">
      {/* Doubling toggle — fixed height at top */}
      <div className="flex gap-2 mb-3 shrink-0">
        {Doublings.map((dbl) => (
          <button
            key={dbl}
            type="button"
            className={`flex-1 py-3 rounded-xl text-center border-2 active:scale-[0.98] transition text-lg font-semibold ${
              doubling === dbl
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
            onClick={() => setDoubling(dbl)}
          >
            {doublingLabels[dbl]}
          </button>
        ))}
      </div>

      {/* Direction buttons — grow to fill remaining space */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        {Directions.map((dir) => (
          <button
            key={dir}
            type="button"
            className="flex-1 w-full rounded-xl text-center border-2 border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition text-3xl font-bold text-gray-900 flex items-center justify-center"
            onClick={() => onDeclarerSelected(dir, doubling)}
          >
            {suit === "NT" ? (
              <>
                {level}NT{dir}
                {doubling}
              </>
            ) : (
              <>
                {level}
                <span className={suitSymbolColor[suit]}>{SuitMap[suit]}</span>
                {dir}
                {doubling}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
