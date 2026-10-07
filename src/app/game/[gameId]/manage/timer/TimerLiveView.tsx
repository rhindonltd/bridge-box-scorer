"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { TimerStatus } from "./timer-view-types";

const btnBase =
  "py-4 rounded-xl text-lg font-semibold active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export interface TimerLiveViewProps {
  timer: TimerStatus;
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
 * running status and lets the director start/pause, step phases, and adjust the
 * current phase. Used on /manage/timer after the game has started. Timer
 * configuration is set during setup and is not editable once the game is live.
 */
export function TimerLiveView({
  timer,
  onStart,
  onPause,
  onNext,
  onPrevious,
  onAdjustTime,
  adjustApplyToFuture,
  onAdjustApplyToFutureChange,
  headerSlot,
}: TimerLiveViewProps) {
  // Once the session has finished there is nothing left to control, so we drop
  // the transport/adjust surface entirely and just confirm it's complete.
  if (timer.phase === "finished") {
    return (
      <GamePageLayout headerTitle="Timer Controls" centerContent={false}>
        <div className="flex h-full flex-col items-center gap-4 p-4">
          {headerSlot}
          <div
            role="status"
            className="flex flex-1 w-full max-w-md flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-8 text-center"
          >
            <span className="text-2xl font-semibold text-gray-800">
              Session complete
            </span>
          </div>
        </div>
      </GamePageLayout>
    );
  }

  const transport = (
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
          className={`${btnBase} bg-green-700 text-white hover:bg-green-800 focus-visible:ring-green-500`}
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
          ‹<span className="hidden sm:inline"> Prev</span>
        </button>
        <button
          onClick={onNext}
          aria-label="Next phase"
          className={`${btnBase} bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-400`}
        >
          <span className="hidden sm:inline">Next </span>›
        </button>
      </div>
    </div>
  );

  const controls = (
    <div className="flex-1 w-full max-w-md">
      {/* Add / subtract time to the current phase */}
      <div className="flex h-full flex-col gap-2 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3">
        <h2 className="-mx-3 -mt-3 mb-1 border-b border-gray-200 bg-gray-100 px-3 py-2 text-base font-semibold text-gray-700">
          Adjust current phase
        </h2>
        <div className="flex flex-1 flex-col gap-2">
          <div className="grid flex-1 grid-cols-4 gap-2">
            <button
              onClick={() => onAdjustTime(-60)}
              className={`${btnBase} bg-red-100 text-red-800 hover:bg-red-200 focus-visible:ring-red-400 text-base`}
            >
              −1m
            </button>
            <button
              onClick={() => onAdjustTime(-15)}
              className={`${btnBase} bg-red-100 text-red-800 hover:bg-red-200 focus-visible:ring-red-400 text-base`}
            >
              −15s
            </button>
            <button
              onClick={() => onAdjustTime(15)}
              className={`${btnBase} bg-green-100 text-green-800 hover:bg-green-200 focus-visible:ring-green-400 text-base`}
            >
              +15s
            </button>
            <button
              onClick={() => onAdjustTime(60)}
              className={`${btnBase} bg-green-100 text-green-800 hover:bg-green-200 focus-visible:ring-green-400 text-base`}
            >
              +1m
            </button>
          </div>
          <label className="flex flex-1 items-center gap-2 text-base text-gray-600">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={adjustApplyToFuture}
              onChange={(e) => onAdjustApplyToFutureChange(e.target.checked)}
            />
            Apply to all subsequent phases of this type
          </label>
        </div>
      </div>
    </div>
  );

  const status = (
    <div className="flex-1 w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-5 text-base">
      <div className="flex justify-between">
        <span className="text-gray-500">Status</span>
        <span className="capitalize font-medium">
          {timer.phase === "awaitingDraw"
            ? "Awaiting next round draw"
            : timer.isRunning
              ? timer.phase
              : "paused"}
        </span>
      </div>
      <div className="flex justify-between mt-3">
        <span className="text-gray-500">Remaining</span>
        <span className="font-medium">{formatTime(timer.remaining)}</span>
      </div>
      <div className="flex justify-between mt-3">
        <span className="text-gray-500">Round</span>
        <span className="font-medium">{timer.round}</span>
      </div>
      {timer.projectedEndDate && (
        <div className="flex justify-between mt-3">
          <span className="text-gray-500">Live End</span>
          <span className="font-medium">
            {timer.projectedEndDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}

      {/* Primary transport controls, grouped with the status they act on. */}
      <div className="mt-4 pt-4 border-t border-gray-200">{transport}</div>
    </div>
  );

  return (
    <GamePageLayout headerTitle="Timer Controls" centerContent={false}>
      <div className="flex h-full flex-col items-center gap-4 p-4">
        {headerSlot}
        {status}
        {controls}
      </div>
    </GamePageLayout>
  );
}
