"use client";

import { useMemo, useState } from "react";
import { Level } from "@/model/contract";

type Props = {
  level: Level;
  onResultComplete: (mode: "made" | "down", value: number) => void;
};

export function StepResult({ level, onResultComplete }: Props) {
  const [mode, setMode] = useState<"made" | "down">("made");
  const [value, setValue] = useState(0);

  const requiredTricks = 6 + level;
  const maxOver = 13 - requiredTricks;
  const maxDown = requiredTricks;

  const values = useMemo(() => {
    return mode === "made"
      ? Array.from({ length: maxOver + 1 }, (_, i) => i)
      : Array.from({ length: maxDown }, (_, i) => i + 1);
  }, [mode, maxOver, maxDown]);

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col">
        {/* Made/Down toggle — same style as doubling toggle */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
              mode === "made"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
            onClick={() => { setMode("made"); setValue(0); }}
          >
            Made
          </button>
          <button
            type="button"
            className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
              mode === "down"
                ? "bg-red-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
            onClick={() => { setMode("down"); setValue(1); }}
          >
            Down
          </button>
        </div>

        {/* Number grid — consistent with suit/declarer button style */}
        <div className="grid grid-cols-3 gap-3">
          {values.map((v) => {
            const isSelected = v === value;
            const label = mode === "made" ? `+${v}` : `${v}`;
            return (
              <button
                key={v}
                type="button"
                className={`py-4 rounded-xl text-center text-3xl font-bold transition active:scale-[0.98] ${
                  isSelected
                    ? "bg-blue-600 text-white border-2 border-blue-600"
                    : "border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-900"
                }`}
                onClick={() => setValue(v)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Next button pinned to bottom */}
      <div className="max-w-sm mx-auto w-full pt-4">
        <button
          type="button"
          onClick={() => onResultComplete(mode, value)}
          className="w-full py-3 text-lg font-bold rounded-xl bg-blue-600 text-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}
