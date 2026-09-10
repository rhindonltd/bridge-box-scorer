"use client";

import { DurationStepperInput } from "./DurationStepperInput";
import { TimerConfig } from "./timer-view-types";

interface Props {
  config: TimerConfig;
  onConfigChange: (field: keyof TimerConfig, value: number | string) => void;
  /**
   * When true, Boards / Round and Total Rounds are derived from the selected
   * movement and shown read-only (the director cannot edit them here).
   */
  lockedStructure?: boolean;
}

/**
 * The editable timer configuration form: boards per round, total rounds,
 * timing mode, play/move durations, and the warning threshold. Shared by the
 * config screen and the live screen's "Apply Changes" editing.
 *
 * Numeric fields use {@link DurationStepperInput}, which pairs a text field
 * with −/+ steppers (reliable on touch) and lets the box be cleared while
 * typing instead of snapping back to a sticky zero.
 */
export function TimerConfigFields({
  config,
  onConfigChange,
  lockedStructure = false,
}: Props) {
  return (
    <div className="flex w-full max-w-md flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="boards-per-round"
            className="text-sm font-medium text-gray-600"
          >
            Boards / Round
          </label>
          <DurationStepperInput
            id="boards-per-round"
            label="Boards / Round"
            value={config.boardsPerRound}
            min={1}
            readOnly={lockedStructure}
            onChange={(v) => onConfigChange("boardsPerRound", v)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="total-rounds"
            className="text-sm font-medium text-gray-600"
          >
            Total Rounds
          </label>
          <DurationStepperInput
            id="total-rounds"
            label="Total Rounds"
            value={config.totalRounds}
            min={1}
            readOnly={lockedStructure}
            onChange={(v) => onConfigChange("totalRounds", v)}
          />
        </div>
        {lockedStructure && (
          <p className="col-span-2 -mt-1 text-xs text-gray-500">
            Boards per round and total rounds come from the selected movement.
          </p>
        )}
      </div>

      <fieldset className="flex gap-6">
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

      <DurationField
        label={
          config.timingMode === "perBoard"
            ? "Play Duration (per board)"
            : "Play Duration"
        }
        minutes={config.playMinutes}
        seconds={config.playSeconds}
        minutesLabel="Play minutes"
        secondsLabel="Play seconds"
        onMinutesChange={(v) => onConfigChange("playMinutes", v)}
        onSecondsChange={(v) => onConfigChange("playSeconds", v)}
      />

      <DurationField
        label="Move Duration"
        minutes={config.moveMinutes}
        seconds={config.moveSeconds}
        minutesLabel="Move minutes"
        secondsLabel="Move seconds"
        onMinutesChange={(v) => onConfigChange("moveMinutes", v)}
        onSecondsChange={(v) => onConfigChange("moveSeconds", v)}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="warning-seconds"
          className="text-sm font-medium text-gray-600"
        >
          Warning at (seconds before end of play)
        </label>
        <div className="max-w-[16rem]">
          <DurationStepperInput
            id="warning-seconds"
            label="Warning at (seconds before end of play)"
            value={config.warningSeconds}
            min={0}
            suffix="s"
            onChange={(v) => onConfigChange("warningSeconds", v)}
          />
        </div>
      </div>
    </div>
  );
}

interface DurationFieldProps {
  label: string;
  minutes: number;
  seconds: number;
  minutesLabel: string;
  secondsLabel: string;
  onMinutesChange: (value: number) => void;
  onSecondsChange: (value: number) => void;
}

/**
 * A labelled minutes + seconds pair. The two steppers sit in a two-column grid
 * that shrinks to fit, so the fields never overlap on narrow screens.
 */
function DurationField({
  label,
  minutes,
  seconds,
  minutesLabel,
  secondsLabel,
  onMinutesChange,
  onSecondsChange,
}: DurationFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <DurationStepperInput
            label={minutesLabel}
            value={minutes}
            min={0}
            suffix="m"
            onChange={onMinutesChange}
          />
          <span className="pl-1 text-xs text-gray-400">min</span>
        </div>
        <div className="flex flex-col gap-1">
          <DurationStepperInput
            label={secondsLabel}
            value={seconds}
            min={0}
            max={59}
            suffix="s"
            onChange={onSecondsChange}
          />
          <span className="pl-1 text-xs text-gray-400">sec</span>
        </div>
      </div>
    </div>
  );
}
