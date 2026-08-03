"use client";

import { Level, Levels } from "@/model/contract";
import { SpecialBoardOutcome } from "@/model/result";

type Props = {
  onLevelSelected: (level: Level) => void;
  onSpecialOutcome: (outcome: SpecialBoardOutcome) => void;
};

export function StepLevel({ onLevelSelected, onSpecialOutcome }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-sm mx-auto w-full flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="bg-gray-200 text-gray-800 hover:bg-gray-300 py-4 text-xl font-bold rounded-xl"
            onClick={() => onSpecialOutcome("NP")}
          >
            Not Played
          </button>
          <button
            type="button"
            className="bg-gray-200 text-gray-800 hover:bg-gray-300 py-4 text-xl font-bold rounded-xl"
            onClick={() => onSpecialOutcome("PO")}
          >
            Pass Out
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {Levels.map((level) => (
            <button
              key={level}
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700 py-4 text-xl font-bold rounded-xl"
              onClick={() => onLevelSelected(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
