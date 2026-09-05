"use client";

import { TimerConfig } from "./timer-view-types";

interface Props {
  config: TimerConfig;
  onConfigChange: (field: keyof TimerConfig, value: number | string) => void;
}

/**
 * The editable timer configuration grid: boards per round, total rounds,
 * timing mode, play/move durations, and the warning threshold. Shared by the
 * config screen and the live screen's "Apply Changes" editing.
 */
export function TimerConfigFields({ config, onConfigChange }: Props) {
  return (
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
    </div>
  );
}
