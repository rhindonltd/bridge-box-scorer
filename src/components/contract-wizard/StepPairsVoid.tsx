"use client";

import { PairsVoidCause } from "@/model/pairs-match-void";

type Props = {
  onSubmit: (cause: PairsVoidCause) => void;
};

/**
 * The §3.3.8/§3.3.9 cause for voiding a Swiss-pairs match. The match is removed
 * from the field and each pair is credited an AVE+/AVE−/AVE blend over the
 * match's boards by who was at fault, expressed relative to the table in front
 * of the director (NS = this table, EW = opponents):
 *
 * - `OFFENDER_EW` — opponents (EW) at fault → this table AVE+, opponents AVE−.
 * - `OFFENDER_NS` — this table (NS) at fault → this table AVE−, opponents AVE+.
 * - `NEITHER` — no one at fault → AVE+ to both.
 * - `BOTH` — both at fault → AVE− to both.
 *
 * Each option commits immediately on tap.
 */

type Option = { cause: PairsVoidCause; title: string; detail: string };

const OPTIONS: Option[] = [
  {
    cause: "OFFENDER_EW",
    title: "Opponents (EW) at fault",
    detail: "This table AVE+, opponents AVE− (half the boards)",
  },
  {
    cause: "OFFENDER_NS",
    title: "This table (NS) at fault",
    detail: "This table AVE−, opponents AVE+ (half the boards)",
  },
  {
    cause: "NEITHER",
    title: "Neither side at fault",
    detail: "AVE+ to both",
  },
  {
    cause: "BOTH",
    title: "Both sides at fault",
    detail: "AVE− to both",
  },
];

export function StepPairsVoid({ onSubmit }: Props) {
  return (
    <div className="flex-1 flex flex-col p-4 min-h-0">
      <p className="text-sm text-gray-600 text-center mb-4">
        Void this match. It is removed from the field and each pair is credited
        an average blend by who was at fault.
      </p>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.cause}
            type="button"
            onClick={() => onSubmit(opt.cause)}
            className="py-4 px-4 rounded-xl text-left border-2 border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition"
          >
            <span className="block text-base font-semibold text-gray-900">
              {opt.title}
            </span>
            <span className="block text-sm text-gray-600">{opt.detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
