"use client";

import { Level, Levels } from "@/model/contract";
import { SpecialBoardOutcome } from "@/model/result";

type Props = {
  onLevelSelected: (level: Level) => void;
  onSpecialOutcome: (outcome: SpecialBoardOutcome) => void;
};

export function StepLevel({ onLevelSelected, onSpecialOutcome }: Props) {
  return (
    <div className="flex-1 flex flex-col p-4 min-h-0">
      {/* Special outcomes — fixed height at top */}
      <div className="grid grid-cols-2 gap-3 shrink-0 mb-3">
        <button
          type="button"
          className="py-3 rounded-xl text-center border-2 border-gray-300 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition text-lg font-semibold text-gray-700"
          onClick={() => onSpecialOutcome("NP")}
        >
          Not Played
        </button>
        <button
          type="button"
          className="py-3 rounded-xl text-center border-2 border-gray-300 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition text-lg font-semibold text-gray-700"
          onClick={() => onSpecialOutcome("PO")}
        >
          Pass Out
        </button>
      </div>

      {/* Level buttons — grow to fill remaining space */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0 auto-rows-fr">
        {Levels.map((level) => (
          <button
            key={level}
            type="button"
            className="rounded-xl text-center border-2 border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition text-2xl font-bold text-gray-900 flex items-center justify-center"
            onClick={() => onLevelSelected(level)}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}
