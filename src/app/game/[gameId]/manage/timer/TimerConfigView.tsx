"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { BreakProblem } from "@/timer/breaks";
import { TimerConfigFields } from "./TimerConfigFields";
import { TimerBreaksEditor } from "./TimerBreaksEditor";
import { TimerConfig, TimerConfigHandlers } from "./timer-view-types";

export interface TimerConfigViewProps extends TimerConfigHandlers {
  config: TimerConfig;
  /** Human-readable total session length for the summary panel. */
  sessionLength: string;
  /** Projected session end time for the summary panel. */
  previewEnd: string;
  breakProblems: BreakProblem[];
  /**
   * Optional content rendered above the config (e.g. a section selector for
   * multi-section games).
   */
  headerSlot?: React.ReactNode;
  /**
   * When true, render without the outer GamePageLayout so the screen can be
   * embedded (e.g. beneath the setup flow's tab bar).
   */
  embedded?: boolean;
  /**
   * When true, Boards / Round and Total Rounds are shown read-only (derived
   * from the section's selected movement).
   */
  lockedStructure?: boolean;
  /**
   * When true, no movement is selected for this section: the config is disabled
   * and the director is prompted to choose a movement first.
   */
  noMovement?: boolean;
}

/**
 * Timer configuration screen. Lets the director set phase lengths, breaks and
 * the warning threshold; changes are saved automatically by the container as
 * they are made (no Save button). It deliberately exposes no run controls
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
  headerSlot,
  embedded = false,
  lockedStructure = false,
  noMovement = false,
}: TimerConfigViewProps) {
  const status = (
    <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm">
      <div className="flex justify-between mb-2">
        <span className="text-gray-500">Boards / Round</span>
        <span>{config.boardsPerRound}</span>
      </div>
      <div className="flex justify-between mb-2">
        <span className="text-gray-500">Rounds</span>
        <span>{config.totalRounds}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Session Length</span>
        <span>{sessionLength}</span>
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-gray-500">Session End</span>
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

  const noMovementPrompt = (
    <div
      role="note"
      className="w-full max-w-md rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <div className="font-semibold">Select a movement first</div>
      <p className="mt-1">
        The timer takes its number of rounds and boards per round from the
        movement. Choose a movement for this section, then come back to set up
        the timer.
      </p>
    </div>
  );

  // The section pills sit in a pinned grey bar at the top, matching the
  // Movement step. Rendered only when a headerSlot is supplied.
  const pillsBar = headerSlot ? (
    <div className="flex shrink-0 justify-center border-b border-gray-200 bg-gray-50 px-4 py-3">
      {headerSlot}
    </div>
  ) : null;

  const body = noMovement ? (
    <>{noMovementPrompt}</>
  ) : (
    <>
      {status}
      {breakProblemPrompt}
      <TimerConfigFields
        config={config}
        onConfigChange={onConfigChange}
        lockedStructure={lockedStructure}
      />
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
      <div className="flex flex-col">
        {pillsBar}
        <div className="flex flex-col items-center gap-4 p-4">{body}</div>
      </div>
    );
  }

  return (
    <GamePageLayout headerTitle="Timer Setup" centerContent={false}>
      {pillsBar}
      <div className="flex flex-col items-center gap-4 p-4">{body}</div>
    </GamePageLayout>
  );
}
