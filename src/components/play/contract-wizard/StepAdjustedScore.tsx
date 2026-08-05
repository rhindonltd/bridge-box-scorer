"use client";

import { useState } from "react";

type Props = {
  onSubmit: (nsPercent: number, ewPercent: number) => void;
};

const PRESET_OPTIONS = [
  { label: "AVE (50/50)", ns: 50, ew: 50 },
  { label: "AVE+ / AVE-  (60/40)", ns: 60, ew: 40 },
  { label: "AVE- / AVE+  (40/60)", ns: 40, ew: 60 },
  { label: "AVE+ / AVE+  (60/60)", ns: 60, ew: 60 },
  { label: "AVE- / AVE-  (40/40)", ns: 40, ew: 40 },
];

export function StepAdjustedScore({ onSubmit }: Props) {
  const [nsPercent, setNsPercent] = useState(50);
  const [ewPercent, setEwPercent] = useState(50);

  return (
    <div className="flex-1 flex flex-col p-4 min-h-0">
      <h2 className="text-lg font-bold text-gray-800 text-center mb-4">
        Adjusted Score
      </h2>

      {/* Presets */}
      <div className="flex flex-col gap-2 mb-6">
        {PRESET_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onSubmit(opt.ns, opt.ew)}
            className="py-3 px-4 rounded-xl text-center border-2 border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition text-base font-semibold text-gray-800"
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom entry */}
      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-gray-600 mb-3 text-center">
          Custom
        </p>
        <div className="flex items-center gap-4 justify-center mb-4">
          <div className="flex flex-col items-center gap-1">
            <label
              htmlFor="ns-percent"
              className="text-sm font-semibold text-gray-700"
            >
              NS %
            </label>
            <input
              id="ns-percent"
              type="number"
              min={0}
              max={100}
              value={nsPercent}
              onChange={(e) => setNsPercent(Number(e.target.value))}
              className="w-20 text-center text-lg font-bold border-2 border-gray-300 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <label
              htmlFor="ew-percent"
              className="text-sm font-semibold text-gray-700"
            >
              EW %
            </label>
            <input
              id="ew-percent"
              type="number"
              min={0}
              max={100}
              value={ewPercent}
              onChange={(e) => setEwPercent(Number(e.target.value))}
              className="w-20 text-center text-lg font-bold border-2 border-gray-300 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSubmit(nsPercent, ewPercent)}
          className="w-full bg-green-700 text-white py-3 text-lg font-bold rounded-xl"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
