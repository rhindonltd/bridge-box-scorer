"use client";

import { ContractSuit, Level } from "@/model/contract";
import { SuitMap } from "@/model/common";

type Props = {
  level: Level;
  onSuitSelected: (suit: ContractSuit) => void;
};

const SUIT_ORDER: ContractSuit[] = ["C", "D", "H", "S", "NT"];

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

export function StepSuit({ level, onSuitSelected }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col gap-3 max-w-sm mx-auto w-full">
        {SUIT_ORDER.map((suit) => (
          <button
            key={suit}
            type="button"
            className={`w-full py-4 rounded-xl text-center border-2 border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition text-3xl font-bold ${suitTextColor[suit]}`}
            onClick={() => onSuitSelected(suit)}
          >
            {suitDisplay(level, suit)}
          </button>
        ))}
      </div>
    </div>
  );
}
