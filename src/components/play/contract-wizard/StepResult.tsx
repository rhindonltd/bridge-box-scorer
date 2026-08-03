"use client";

import { useMemo, useState } from "react";
import { Level } from "@/model/contract";

type Props = {
  level: Level;
  onResultComplete: (mode: "made" | "down", value: number) => void;
};

export function StepResult({ level, onResultComplete }: Props) {
  const [mode, setMode] = useState<"made" | "down">("made");

  const requiredTricks = 6 + level;
  const maxOver = 13 - requiredTricks;
  const maxDown = requiredTricks;

  const values = useMemo(() => {
    return mode === "made"
      ? Array.from({ length: maxOver + 1 }, (_, i) => i)
      : Array.from({ length: maxDown }, (_, i) => i + 1);
  }, [mode, maxOver, maxDown]);

  // Calculate max rows across both modes to keep button height consistent
  const maxRowsMade = Math.ceil((maxOver + 1) / 3);
  const maxRowsDown = Math.ceil(maxDown / 3);
  const maxRows = Math.max(maxRowsMade, maxRowsDown);

  return (
    <div className="flex-1 flex flex-col p-4 min-h-0">
      {/* Made/Down toggle — fixed at top */}
      <div className="flex gap-2 mb-3 shrink-0">
        <button
          type="button"
          className={`flex-1 py-3 rounded-xl text-center border-2 active:scale-[0.98] transition text-lg font-semibold ${
            mode === "made"
              ? "bg-green-600 text-white border-green-600"
              : "border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
          onClick={() => setMode("made")}
        >
          Made
        </button>
        <button
          type="button"
          className={`flex-1 py-3 rounded-xl text-center border-2 active:scale-[0.98] transition text-lg font-semibold ${
            mode === "down"
              ? "bg-red-600 text-white border-red-600"
              : "border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
          onClick={() => setMode("down")}
        >
          Down
        </button>
      </div>

      {/* Number grid — fixed row count based on the larger mode */}
      <div
        className="flex-1 grid grid-cols-3 gap-2 min-h-0"
        style={{ gridTemplateRows: `repeat(${maxRows}, 1fr)` }}
      >
        {values.map((v) => {
          const label = mode === "made" ? `+${v}` : `-${v}`;
          return (
            <button
              key={v}
              type="button"
              className="rounded-xl text-center text-2xl font-bold transition active:scale-[0.98] border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-900 flex items-center justify-center"
              onClick={() => onResultComplete(mode, v)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
