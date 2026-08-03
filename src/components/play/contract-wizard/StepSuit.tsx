"use client";

import { ContractSuit, Level } from "@/model/contract";
import { SuitMap } from "@/model/common";

type Props = {
  level: Level;
  onSuitSelected: (suit: ContractSuit) => void;
};

const SUIT_ORDER: ContractSuit[] = ["C", "D", "H", "S", "NT"];

const suitSymbolColor: Record<ContractSuit, string> = {
  C: "text-gray-900",
  D: "text-red-600",
  H: "text-red-600",
  S: "text-gray-900",
  NT: "text-gray-900",
};

export function StepSuit({ level, onSuitSelected }: Props) {
  return (
    <div className="flex-1 flex flex-col gap-3 p-4 min-h-0">
      {SUIT_ORDER.map((suit) => (
        <button
          key={suit}
          type="button"
          className="flex-1 w-full rounded-xl text-center border-2 border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition text-3xl font-bold text-gray-900 flex items-center justify-center"
          onClick={() => onSuitSelected(suit)}
        >
          {suit === "NT" ? (
            <>{level}NT</>
          ) : (
            <>
              {level}
              <span className={suitSymbolColor[suit]}>{SuitMap[suit]}</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
