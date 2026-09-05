"use client";

import { BreakDraft } from "./timer-view-types";

interface Props {
  breaks: BreakDraft[];
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
  onAddBreak,
  onRemoveBreak,
  onBreakChange,
}: Props) {
  return (
    <div className="w-full max-w-md flex flex-col gap-3">
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
          className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3"
        >
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">After round</label>
            <input
              aria-label={`Break ${index + 1} after round`}
              type="number"
              value={b.afterRound}
              onChange={(e) =>
                onBreakChange(index, "afterRound", Number(e.target.value))
              }
              className="p-2 w-20 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => onRemoveBreak(index)}
              aria-label={`Remove break ${index + 1}`}
              className="ml-auto rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-200"
            >
              Remove
            </button>
          </div>

          <fieldset className="flex gap-4">
            <legend className="sr-only">Break {index + 1} mode</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`break-mode-${index}`}
                checked={b.mode === "duration"}
                onChange={() => onBreakChange(index, "mode", "duration")}
              />
              Duration
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`break-mode-${index}`}
                checked={b.mode === "resumeTime"}
                onChange={() => onBreakChange(index, "mode", "resumeTime")}
              />
              Resume at time
            </label>
          </fieldset>

          {b.mode === "duration" ? (
            <div className="flex items-center gap-2">
              <input
                aria-label={`Break ${index + 1} duration minutes`}
                type="number"
                value={b.durationMinutes}
                onChange={(e) =>
                  onBreakChange(
                    index,
                    "durationMinutes",
                    Number(e.target.value),
                  )
                }
                className="p-2 w-20 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
