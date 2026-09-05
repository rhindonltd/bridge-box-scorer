"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { BreakProblem } from "@/timer/breaks";
import { TimerConfigFields } from "./TimerConfigFields";
import { TimerBreaksEditor } from "./TimerBreaksEditor";
import {
  TimerConfig,
  TimerConfigHandlers,
  TimerStatus,
} from "./timer-view-types";

const btnBase =
  "py-4 rounded-xl text-lg font-semibold active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export interface TimerLiveViewProps extends TimerConfigHandlers {
  timer: TimerStatus;
  config: TimerConfig;
  breakProblems: BreakProblem[];
  onApplyChanges: () => void;
  onStart: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onAdjustTime: (deltaSeconds: number) => void;
  adjustApplyToFuture: boolean;
  onAdjustApplyToFutureChange: (value: boolean) => void;
  /**
   * Optional content rendered above the status (e.g. a section selector for
   * multi-section games).
   */
  headerSlot?: React.ReactNode;
}

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Live timer control screen. Shown once the game is in progress: displays the
 * running status and lets the director start/pause, step phases, adjust the
 * current phase, and apply configuration changes to the running timer. Used on
 * /manage/timer after the game has started.
 */
export function TimerLiveView({
  timer,
  config,
  breakProblems,
  onConfigChange,
  onAddBreak,
  onRemoveBreak,
  onBreakChange,
  onApplyChanges,
  onStart,
  onPause,
  onNext,
  onPrevious,
  onAdjustTime,
  adjustApplyToFuture,
  onAdjustApplyToFutureChange,
  headerSlot,
}: TimerLiveViewProps) {
  const controls = (
    <div className="flex flex-col gap-3 w-full max-w-md">
      <button
        onClick={onApplyChanges}
        className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500`}
      >
        Apply Changes
      </button>

      <div className="grid grid-cols-2 gap-3">
        {timer.isRunning ? (
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
    </div>
  );

  const status = (
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
          {timer.phase === "finished" ? "00:00" : formatTime(timer.remaining)}
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

  return (
    <GamePageLayout
      headerTitle="Timer Controls"
      centerContent={false}
      actions={controls}
    >
      <div className="flex flex-col items-center gap-4 p-4">
        {headerSlot}
        {status}
        {breakProblemPrompt}
        <TimerConfigFields config={config} onConfigChange={onConfigChange} />
        <TimerBreaksEditor
          breaks={config.breaks}
          onAddBreak={onAddBreak}
          onRemoveBreak={onRemoveBreak}
          onBreakChange={onBreakChange}
        />
      </div>
    </GamePageLayout>
  );
}
