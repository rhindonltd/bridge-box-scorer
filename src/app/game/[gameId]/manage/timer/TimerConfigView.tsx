"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { BreakProblem } from "@/timer/breaks";
import { TimerConfigFields } from "./TimerConfigFields";
import { TimerBreaksEditor } from "./TimerBreaksEditor";
import { TimerConfig, TimerConfigHandlers } from "./timer-view-types";

const btnBase =
  "py-4 rounded-xl text-lg font-semibold active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export interface TimerConfigViewProps extends TimerConfigHandlers {
  config: TimerConfig;
  /** Human-readable total session length for the preview panel. */
  sessionLength: string;
  /** Projected end time for the preview panel. */
  previewEnd: string;
  breakProblems: BreakProblem[];
  /** Persist the current configuration (does not start the timer). */
  onSave: () => void;
  /**
   * When true, render without the outer GamePageLayout so the screen can be
   * embedded (e.g. beneath the setup flow's tab bar).
   */
  embedded?: boolean;
}

/**
 * Timer configuration screen. Lets the director set phase lengths, breaks and
 * the warning threshold, and save them. It deliberately exposes no run controls
 * (start/pause/next/adjust) and no live status: the timer only begins when the
 * game is started. Used on the setup Timer tab and on /manage/timer before the
 * game has started.
 */
export function TimerConfigView({
  config,
  sessionLength,
  previewEnd,
  breakProblems,
  onConfigChange,
  onAddBreak,
  onRemoveBreak,
  onBreakChange,
  onSave,
  embedded = false,
}: TimerConfigViewProps) {
  const saveButton = (
    <div className="flex flex-col gap-3 w-full max-w-md">
      <button
        onClick={onSave}
        className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500`}
      >
        Save
      </button>
    </div>
  );

  const status = (
    <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm">
      <div className="text-gray-500 mb-2">Not started yet</div>
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

  const body = (
    <>
      {status}
      {breakProblemPrompt}
      <TimerConfigFields config={config} onConfigChange={onConfigChange} />
      <TimerBreaksEditor
        breaks={config.breaks}
        onAddBreak={onAddBreak}
        onRemoveBreak={onRemoveBreak}
        onBreakChange={onBreakChange}
      />
    </>
  );

  if (embedded) {
    return (
      <div className="flex flex-col items-center gap-4 p-4">
        {body}
        {saveButton}
      </div>
    );
  }

  return (
    <GamePageLayout
      headerTitle="Timer Setup"
      centerContent={false}
      actions={saveButton}
    >
      <div className="flex flex-col items-center gap-4 p-4">{body}</div>
    </GamePageLayout>
  );
}
