"use client";

import { PillToggle } from "@/components/common/PillToggle";
import { StepperInput } from "@/components/common/StepperInput";
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
 * Numeric fields use {@link StepperInput}, a single segmented control
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
            <StepperInput
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
            <StepperInput
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
          name="timingMode"
          legend="Timing Mode"
          options={[
            { value: "perRound", label: "Per Round" },
            { value: "perBoard", label: "Per Board" },
          ]}
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
          <StepperInput
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
          <StepperInput
            label={minutesLabel}
            value={minutes}
            min={0}
            suffix="m"
            onChange={onMinutesChange}
          />
          <span className="pl-1 text-xs text-gray-400">min</span>
        </div>
        <div className="flex flex-col gap-1">
          <StepperInput
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
