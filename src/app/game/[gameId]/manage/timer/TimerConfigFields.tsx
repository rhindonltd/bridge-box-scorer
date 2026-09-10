"use client";

import { DurationStepperInput } from "./DurationStepperInput";
import { TimerConfig } from "./timer-view-types";

interface Props {
  config: TimerConfig;
  onConfigChange: (field: keyof TimerConfig, value: number | string) => void;
  /**
   * When true, Boards / Round and Total Rounds are derived from the selected
   * movement. In that case they are shown in the summary panel above and the
   * editable inputs are omitted here to avoid duplicating them. When false
   * (the live "Apply Changes" screen) they are editable here.
   */
  lockedStructure?: boolean;
}

/**
 * The editable timer configuration card: timing mode, play/move durations and
 * the warning threshold, plus editable round structure when it is not derived
 * from a movement. Shared by the config screen and the live screen's "Apply
 * Changes" editing.
 *
 * Numeric fields use {@link DurationStepperInput}, a single segmented control
 * (−/+ around a text field) that is reliable on touch and lets the box be
 * cleared while typing instead of snapping back to a sticky zero.
 */
export function TimerConfigFields({
  config,
  onConfigChange,
  lockedStructure = false,
}: Props) {
  return (
    <div className="flex w-full max-w-md flex-col gap-5 rounded-xl border border-gray-200 bg-white p-4">
      {/* Round structure is only editable when it is not derived from a
          movement; otherwise it lives read-only in the summary panel above. */}
      {!lockedStructure && (
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
              onChange={(v) => onConfigChange("totalRounds", v)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-gray-600">Timing</span>
        <PillToggle
          value={config.timingMode}
          onChange={(mode) => onConfigChange("timingMode", mode)}
        />
      </div>

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
        <div className="max-w-[14rem]">
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

interface PillToggleProps {
  value: TimerConfig["timingMode"];
  onChange: (mode: TimerConfig["timingMode"]) => void;
}

/**
 * Segmented pill control for the play/board timing mode. Uses real radio inputs
 * (visually hidden) so it stays keyboard- and screen-reader accessible while
 * presenting as two pills.
 */
function PillToggle({ value, onChange }: PillToggleProps) {
  const pill = (active: boolean) =>
    `flex-1 cursor-pointer rounded-lg px-4 py-2 text-center text-sm font-medium transition ${
      active
        ? "bg-white text-blue-700 shadow-sm"
        : "text-gray-600 hover:text-gray-800"
    }`;

  return (
    <fieldset className="flex gap-1 rounded-xl bg-gray-100 p-1">
      <legend className="sr-only">Timing Mode</legend>
      <label className={pill(value === "perRound")}>
        <input
          type="radio"
          name="timingMode"
          className="sr-only"
          checked={value === "perRound"}
          onChange={() => onChange("perRound")}
        />
        Per Round
      </label>
      <label className={pill(value === "perBoard")}>
        <input
          type="radio"
          name="timingMode"
          className="sr-only"
          checked={value === "perBoard"}
          onChange={() => onChange("perBoard")}
        />
        Per Board
      </label>
    </fieldset>
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
 * A labelled minutes + seconds pair. The two segmented steppers sit in a
 * two-column grid that shrinks to fit, so the fields never overlap on narrow
 * screens.
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
            max={45}
            step={15}
            wrap
            suffix="s"
            onChange={onSecondsChange}
          />
          <span className="pl-1 text-xs text-gray-400">sec</span>
        </div>
      </div>
    </div>
  );
}
