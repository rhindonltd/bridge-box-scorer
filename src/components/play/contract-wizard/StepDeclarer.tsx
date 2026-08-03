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

const suitTextColor: Record<ContractSuit, string> = {
  C: "text-gray-900",
  D: "text-red-600",
  H: "text-red-600",
  S: "text-gray-900",
  NT: "text-gray-600",
};

function suitDisplay(level: Level, suit: ContractSuit): string {
  if (suit === "NT") return `${level}NT`;
  return `${level}${SuitMap[suit]}`;
}

function buttonLabel(
  level: Level,
  suit: ContractSuit,
  direction: Direction,
  doubling: Doubling,
): string {
  return `${suitDisplay(level, suit)}${direction}${doubling}`;
}

export function StepDeclarer({
  level,
  suit,
  onDeclarerSelected,
}: Props) {
  const [doubling, setDoubling] = useState<Doubling>("");

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full">
        {/* Doubling toggle */}
        <div className="flex gap-2 mb-6">
          {Doublings.map((dbl) => (
            <button
              key={dbl}
              type="button"
              className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
                doubling === dbl
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
              onClick={() => setDoubling(dbl)}
            >
              {doublingLabels[dbl]}
            </button>
          ))}
        </div>

        {/* Direction buttons - single column */}
        <div className="flex flex-col gap-3">
          {Directions.map((dir) => (
            <button
              key={dir}
              type="button"
              className={`w-full py-4 rounded-xl text-center border-2 border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition text-3xl font-bold ${suitTextColor[suit]}`}
              onClick={() => onDeclarerSelected(dir, doubling)}
            >
              {buttonLabel(level, suit, dir, doubling)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
