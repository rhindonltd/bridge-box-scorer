"use client";

import { PillToggle } from "@/components/common/PillToggle";
import { StepperInput } from "@/components/common/StepperInput";
import { BreakDraft } from "./timer-view-types";

interface Props {
  breaks: BreakDraft[];
  /**
   * Total number of rounds, used to bound "After round" (a break can only sit
   * between rounds, so it ranges 1..totalRounds-1).
   */
  totalRounds: number;
  onAddBreak: () => void;
  onRemoveBreak: (index: number) => void;
  onBreakChange: (
    index: number,
    field: keyof BreakDraft,
    value: number | string,
  ) => void;
}

/**
 * Editor for scheduled breaks: add/remove breaks and, per break, choose whether
 * it lasts a fixed duration or resumes at a set time. Shared by the config
 * screen and the live screen's "Apply Changes" editing.
 */
export function TimerBreaksEditor({
  breaks,
  totalRounds,
  onAddBreak,
  onRemoveBreak,
  onBreakChange,
}: Props) {
  // A break sits between rounds, so it can be placed after rounds 1..N-1.
  const maxAfterRound = Math.max(1, totalRounds - 1);
  return (
    <div className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Breaks</span>
        <button
          type="button"
          onClick={onAddBreak}
          className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 hover:bg-blue-200"
        >
          + Add break
        </button>
      </div>

      {breaks.length === 0 && (
        <div className="text-sm text-gray-400">No breaks scheduled.</div>
      )}

      {breaks.map((b, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3"
        >
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">After round</label>
            <div className="w-32">
              <StepperInput
                label={`Break ${index + 1} after round`}
                value={b.afterRound}
                min={1}
                max={maxAfterRound}
                onChange={(v) => onBreakChange(index, "afterRound", v)}
              />
            </div>
            <button
              type="button"
              onClick={() => onRemoveBreak(index)}
              aria-label={`Remove break ${index + 1}`}
              className="ml-auto rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-200"
            >
              Remove
            </button>
          </div>

          <PillToggle
            name={`break-mode-${index}`}
            legend={`Break ${index + 1} mode`}
            options={[
              { value: "duration", label: "Duration" },
              { value: "resumeTime", label: "Resume at time" },
            ]}
            value={b.mode}
            onChange={(mode) => onBreakChange(index, "mode", mode)}
          />

          {b.mode === "duration" ? (
            <div className="flex items-center gap-3">
              <div className="w-32">
                <StepperInput
                  label={`Break ${index + 1} duration minutes`}
                  value={b.durationMinutes}
                  min={0}
                  onChange={(v) => onBreakChange(index, "durationMinutes", v)}
                />
              </div>
              <span className="text-sm text-gray-500">minutes</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                aria-label={`Break ${index + 1} resume time`}
                type="time"
                value={b.resumeAt}
                onChange={(e) =>
                  onBreakChange(index, "resumeAt", e.target.value)
                }
                className="p-2 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {b.computedLength != null && (
                <span className="text-sm text-gray-500">
                  ≈ {b.computedLength} break
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
