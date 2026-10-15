"use client";

import { PageLayout } from "@/components/layout/PageLayout";
import { StepperInput } from "@/components/common/StepperInput";

const primaryButtonClass =
  "w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50";

/**
 * Presentational default-timer form. It owns no data fetching — the parent
 * ({@link DefaultTimerSettingsPage}) loads the stored settings and performs the
 * save; this component renders the duration steppers, the status message, and
 * the Save button. Durations are entered as minutes + seconds, matching the
 * per-game Timer tab. Splitting it out keeps the form storyable and testable.
 */
export interface DefaultTimerSettingsFormProps {
  /** Play-per-board minutes (controlled by the parent). */
  playMinutes: number;
  /** Play-per-board seconds (controlled by the parent). */
  playSeconds: number;
  /** Changeover (move) minutes. */
  moveMinutes: number;
  /** Changeover (move) seconds. */
  moveSeconds: number;
  /** Last-minute warning threshold, in seconds (0 = no warning). */
  warningSeconds: number;
  /** Whether a save is in flight (disables the Save button). */
  saving: boolean;
  /**
   * Status/validation message. A message starting with "✅" renders as success
   * (green); anything else renders as an error (red).
   */
  message: string | null;
  onPlayMinutesChange: (value: number) => void;
  onPlaySecondsChange: (value: number) => void;
  onMoveMinutesChange: (value: number) => void;
  onMoveSecondsChange: (value: number) => void;
  onWarningSecondsChange: (value: number) => void;
  onSave: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function DefaultTimerSettingsForm({
  playMinutes,
  playSeconds,
  moveMinutes,
  moveSeconds,
  warningSeconds,
  saving,
  message,
  onPlayMinutesChange,
  onPlaySecondsChange,
  onMoveMinutesChange,
  onMoveSecondsChange,
  onWarningSecondsChange,
  onSave,
  onBack,
}: DefaultTimerSettingsFormProps) {
  return (
    <PageLayout
      headerTitle="Default Timer"
      backAction={onBack}
      actions={
        <button
          type="submit"
          form="default-timer-form"
          disabled={saving}
          className={primaryButtonClass}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      }
    >
      <form
        id="default-timer-form"
        onSubmit={onSave}
        className="px-6 pt-6 max-w-sm w-full mx-auto"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Set the timing every new game starts with. The play time is per
            board, so a round&apos;s length depends on how many boards it has.
            You can still adjust the timer for any individual game on its Timer
            tab.
          </p>

          <DurationField
            label="Play Duration (per board)"
            minutes={playMinutes}
            seconds={playSeconds}
            minutesLabel="Play minutes"
            secondsLabel="Play seconds"
            onMinutesChange={onPlayMinutesChange}
            onSecondsChange={onPlaySecondsChange}
          />

          <DurationField
            label="Changeover (move between rounds)"
            minutes={moveMinutes}
            seconds={moveSeconds}
            minutesLabel="Move minutes"
            secondsLabel="Move seconds"
            onMinutesChange={onMoveMinutesChange}
            onSecondsChange={onMoveSecondsChange}
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
                value={warningSeconds}
                min={0}
                suffix="s"
                onChange={onWarningSecondsChange}
              />
            </div>
            <p className="text-xs text-gray-500">
              The display turns red this many seconds before play ends. Set to 0
              for no warning.
            </p>
          </div>

          {message && (
            <p
              className={`text-base text-center ${message.startsWith("✅") ? "text-green-700" : "text-red-600"}`}
            >
              {message}
            </p>
          )}
        </div>
      </form>
    </PageLayout>
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
 * A labelled minutes + seconds pair, matching the per-game Timer tab's input
 * so directors see the same control in both places. Seconds snap in 15s steps.
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
          <span className="pl-1 text-xs text-gray-500">min</span>
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
          <span className="pl-1 text-xs text-gray-500">sec</span>
        </div>
      </div>
    </div>
  );
}
