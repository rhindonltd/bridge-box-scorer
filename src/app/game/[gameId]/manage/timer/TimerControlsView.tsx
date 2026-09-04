"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { BreakProblem } from "@/timer/breaks";

export interface TimerStatus {
  isRunning: boolean;
  phase: string | null;
  remaining: number;
  round: number | null;
  projectedEndDate: Date | null;
}

/** A break row as edited in the director UI. */
export interface BreakDraft {
  afterRound: number;
  mode: "duration" | "resumeTime";
  /** Duration mode: minutes. */
  durationMinutes: number;
  /** Resume-time mode: "HH:MM" local time string. */
  resumeAt: string;
  /** Human-readable computed length for resume-time mode (e.g. "12m"). */
  computedLength?: string | null;
}

interface TimerConfig {
  boardsPerRound: number;
  totalRounds: number;
  playMinutes: number;
  playSeconds: number;
  moveMinutes: number;
  moveSeconds: number;
  timingMode: "perRound" | "perBoard";
  warningSeconds: number;
  breaks: BreakDraft[];
}

export interface TimerControlsViewProps {
  hasSession: boolean;
  timer: TimerStatus | null;
  config: TimerConfig;
  sessionLength: string;
  previewEnd: string;
  breakProblems: BreakProblem[];
  onConfigChange: (
    field: keyof TimerConfig,
    value: number | string,
  ) => void;
  onAddBreak: () => void;
  onRemoveBreak: (index: number) => void;
  onBreakChange: (
    index: number,
    field: keyof BreakDraft,
    value: number | string,
  ) => void;
  onCreate: () => void;
  onApplyChanges: () => void;
  onStart: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onAdjustTime: (deltaSeconds: number) => void;
  adjustApplyToFuture: boolean;
  onAdjustApplyToFutureChange: (value: boolean) => void;
  /**
   * When true, render without the outer GamePageLayout so the controls can be
   * embedded (e.g. beneath the setup flow's tab bar).
   */
  embedded?: boolean;
}

const btnBase =
  "py-4 rounded-xl text-lg font-semibold active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export function TimerControlsView({
  hasSession,
  timer,
  config,
  sessionLength,
  previewEnd,
  breakProblems,
  onConfigChange,
  onAddBreak,
  onRemoveBreak,
  onBreakChange,
  onCreate,
  onApplyChanges,
  onStart,
  onPause,
  onNext,
  onPrevious,
  onAdjustTime,
  adjustApplyToFuture,
  onAdjustApplyToFutureChange,
  embedded = false,
}: TimerControlsViewProps) {
  function formatTime(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  const controls = (
    <div className="flex flex-col gap-3 w-full max-w-md">
      {!hasSession ? (
        <button
          onClick={onCreate}
          className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500`}
        >
          Create
        </button>
      ) : (
        <>
          <button
            onClick={onApplyChanges}
            className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500`}
          >
            Apply Changes
          </button>

          <div className="grid grid-cols-2 gap-3">
            {timer?.isRunning ? (
              <button
                onClick={onPause}
                className={`${btnBase} bg-yellow-500 text-gray-900 hover:bg-yellow-600 focus-visible:ring-yellow-500`}
              >
                Pause
              </button>
            ) : (
              <button
                onClick={onStart}
                className={`${btnBase} bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500`}
              >
                Start
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onPrevious}
                aria-label="Previous phase"
                className={`${btnBase} bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-400`}
              >
                ‹ Prev
              </button>
              <button
                onClick={onNext}
                aria-label="Next phase"
                className={`${btnBase} bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-400`}
              >
                Next ›
              </button>
            </div>
          </div>

          {/* Add / subtract time to the current phase */}
          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <span className="text-sm text-gray-600">Adjust current phase</span>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => onAdjustTime(-60)}
                className={`${btnBase} bg-red-100 text-red-800 hover:bg-red-200 focus-visible:ring-red-400 text-base py-3`}
              >
                −1m
              </button>
              <button
                onClick={() => onAdjustTime(-15)}
                className={`${btnBase} bg-red-100 text-red-800 hover:bg-red-200 focus-visible:ring-red-400 text-base py-3`}
              >
                −15s
              </button>
              <button
                onClick={() => onAdjustTime(15)}
                className={`${btnBase} bg-green-100 text-green-800 hover:bg-green-200 focus-visible:ring-green-400 text-base py-3`}
              >
                +15s
              </button>
              <button
                onClick={() => onAdjustTime(60)}
                className={`${btnBase} bg-green-100 text-green-800 hover:bg-green-200 focus-visible:ring-green-400 text-base py-3`}
              >
                +1m
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={adjustApplyToFuture}
                onChange={(e) => onAdjustApplyToFutureChange(e.target.checked)}
              />
              Apply to all subsequent phases of this type
            </label>
          </div>
        </>
      )}
    </div>
  );

  const status =
    hasSession && timer ? (
      <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          <span className="capitalize">
            {timer.isRunning ? timer.phase : "paused"}
          </span>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-gray-500">Remaining</span>
          <span>
            {timer.phase === "finished"
              ? "00:00"
              : formatTime(timer.remaining)}
          </span>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-gray-500">Round</span>
          <span>{timer.round}</span>
        </div>
        {timer.projectedEndDate && (
          <div className="flex justify-between mt-2">
            <span className="text-gray-500">Live End</span>
            <span>
              {timer.projectedEndDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>
    ) : (
      <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm">
        <div className="text-gray-500 mb-2">No active session</div>
        <div className="flex justify-between">
          <span className="text-gray-500">Session Length</span>
          <span>{sessionLength}</span>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-gray-500">Preview End</span>
          <span>{previewEnd}</span>
        </div>
      </div>
    );

  const breakProblemPrompt =
    breakProblems.length > 0 ? (
      <div
        role="alert"
        className="w-full max-w-md rounded-xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-800"
      >
        <div className="font-semibold">Break timing is invalid</div>
        {breakProblems.map((p) => (
          <div key={p.afterRound} className="mt-1">
            The break after round {p.afterRound} is set to resume before play
            can finish (over by about {Math.ceil(p.overrunMs / 60000)} min).
            Remove the break or change its timing.
          </div>
        ))}
      </div>
    ) : null;

  const configSection = (
    <div className="grid grid-cols-2 gap-4 w-full max-w-md">
      <div className="flex flex-col gap-1">
        <label htmlFor="boards-per-round" className="text-sm text-gray-600">
          Boards / Round
        </label>
        <input
          id="boards-per-round"
          type="number"
          value={config.boardsPerRound}
          onChange={(e) =>
            onConfigChange("boardsPerRound", Number(e.target.value))
          }
          className="p-2 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="total-rounds" className="text-sm text-gray-600">
          Total Rounds
        </label>
        <input
          id="total-rounds"
          type="number"
          value={config.totalRounds}
          onChange={(e) =>
            onConfigChange("totalRounds", Number(e.target.value))
          }
          className="p-2 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <fieldset className="col-span-2 flex gap-6">
        <legend className="sr-only">Timing Mode</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="timingMode"
            checked={config.timingMode === "perRound"}
            onChange={() => onConfigChange("timingMode", "perRound")}
          />
          Per Round
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="timingMode"
            checked={config.timingMode === "perBoard"}
            onChange={() => onConfigChange("timingMode", "perBoard")}
          />
          Per Board
        </label>
      </fieldset>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">Play Duration</span>
        <div className="flex gap-2">
          <input
            aria-label="Play minutes"
            type="number"
            value={config.playMinutes}
            onChange={(e) =>
              onConfigChange("playMinutes", Number(e.target.value))
            }
            className="p-2 w-20 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            aria-label="Play seconds"
            type="number"
            value={config.playSeconds}
            onChange={(e) =>
              onConfigChange("playSeconds", Number(e.target.value))
            }
            className="p-2 w-20 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            max={59}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">Move Duration</span>
        <div className="flex gap-2">
          <input
            aria-label="Move minutes"
            type="number"
            value={config.moveMinutes}
            onChange={(e) =>
              onConfigChange("moveMinutes", Number(e.target.value))
            }
            className="p-2 w-20 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            aria-label="Move seconds"
            type="number"
            value={config.moveSeconds}
            onChange={(e) =>
              onConfigChange("moveSeconds", Number(e.target.value))
            }
            className="p-2 w-20 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            max={59}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 col-span-2">
        <label htmlFor="warning-seconds" className="text-sm text-gray-600">
          Warning at (seconds before end of play)
        </label>
        <input
          id="warning-seconds"
          type="number"
          value={config.warningSeconds}
          onChange={(e) =>
            onConfigChange("warningSeconds", Number(e.target.value))
          }
          className="p-2 w-28 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Breaks */}
      <div className="col-span-2 flex flex-col gap-3">
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

        {config.breaks.length === 0 && (
          <div className="text-sm text-gray-400">No breaks scheduled.</div>
        )}

        {config.breaks.map((b, index) => (
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
    </div>
  );

  const body = (
    <>
      {status}
      {breakProblemPrompt}
      {configSection}
    </>
  );

  if (embedded) {
    return (
      <div className="flex flex-col items-center gap-4 p-4">
        {body}
        {controls}
      </div>
    );
  }

  return (
    <GamePageLayout
      headerTitle="Timer Controls"
      centerContent={false}
      actions={controls}
    >
      <div className="flex flex-col items-center gap-4 p-4">{body}</div>
    </GamePageLayout>
  );
}
