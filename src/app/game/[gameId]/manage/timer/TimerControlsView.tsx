"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";

export interface TimerStatus {
  isRunning: boolean;
  phase: string | null;
  remaining: number;
  round: number | null;
  projectedEndDate: Date | null;
}

interface TimerConfig {
  boardsPerRound: number;
  totalRounds: number;
  playMinutes: number;
  playSeconds: number;
  moveMinutes: number;
  moveSeconds: number;
  timingMode: "perRound" | "perBoard";
}

export interface TimerControlsViewProps {
  hasSession: boolean;
  timer: TimerStatus | null;
  config: TimerConfig;
  sessionLength: string;
  previewEnd: string;
  onConfigChange: (field: keyof TimerConfig, value: number | string) => void;
  onCreate: () => void;
  onApplyChanges: () => void;
  onStart: () => void;
  onPause: () => void;
  /**
   * When true, render without the outer GamePageLayout so the controls can be
   * embedded (e.g. beneath the setup flow's tab bar). Controls render inline
   * after the config rather than in a fixed bottom action bar.
   */
  embedded?: boolean;
}

export function TimerControlsView({
  hasSession,
  timer,
  config,
  sessionLength,
  previewEnd,
  onConfigChange,
  onCreate,
  onApplyChanges,
  onStart,
  onPause,
  embedded = false,
}: TimerControlsViewProps) {
  function formatTime(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  const controls = (
    <div className="grid grid-cols-2 gap-4 w-full max-w-md">
      {!hasSession ? (
        <button
          onClick={onCreate}
          className="bg-blue-600 text-white py-6 rounded-xl text-xl font-semibold col-span-2 hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Create
        </button>
      ) : (
        <>
          <button
            onClick={onApplyChanges}
            className="bg-blue-600 text-white py-6 rounded-xl text-xl font-semibold col-span-2 hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Apply Changes
          </button>
          <button
            onClick={onStart}
            className="bg-green-600 text-white py-6 rounded-xl text-xl font-semibold hover:bg-green-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            Start
          </button>
          <button
            onClick={onPause}
            className="bg-yellow-500 text-gray-900 py-6 rounded-xl text-xl font-semibold hover:bg-yellow-600 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2"
          >
            Pause
          </button>
        </>
      )}
    </div>
  );

  const body = (
    <>
        <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm">
          {hasSession && timer ? (
            <>
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
            </>
          ) : (
            <>
              <div className="text-gray-500 mb-2">No active session</div>
              <div className="flex justify-between">
                <span className="text-gray-500">Session Length</span>
                <span>{sessionLength}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-500">Preview End</span>
                <span>{previewEnd}</span>
              </div>
            </>
          )}
        </div>

        {/* CONFIG */}
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
        </div>
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
      centerContent={true}
      actions={controls}
    >
      {body}
    </GamePageLayout>
  );
}
