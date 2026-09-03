export type Phase = "move" | "play" | "break" | "finished" | null;

/**
 * A break scheduled in the gap after a given round. Breaks replace the `move`
 * phase for that gap (they never stack). A break is specified in one of two
 * input modes:
 *
 * - `duration`: a fixed length in seconds.
 * - `resumeTime`: an absolute wall-clock time (ms since epoch) at which play
 *   should resume. The break's length is derived from the projected end of the
 *   preceding play segment and this resume time.
 */
export type BreakConfig =
  | {
      /** Break replaces the move gap after this round number (1-based). */
      afterRound: number;
      mode: "duration";
      /** Fixed break length in seconds. */
      durationSeconds: number;
    }
  | {
      afterRound: number;
      mode: "resumeTime";
      /** Absolute wall-clock time (ms since epoch) at which play resumes. */
      resumeAtMs: number;
    };

export type TimerState = {
  version: number;
  phase: Phase;

  board: number;
  round: number;

  boardsPerRound: number;
  totalRounds: number;

  playDuration: number;
  moveDuration: number;

  /**
   * Scheduled breaks, keyed by the round they follow. A break replaces the
   * move phase for that gap. Optional for backwards compatibility with
   * previously-persisted timer state.
   */
  breaks?: BreakConfig[];

  /**
   * Number of seconds before the end of a play phase at which the display
   * should show its "last minute" warning. Optional for backwards
   * compatibility; defaults to 60 when absent.
   */
  warningSeconds?: number;

  isRunning: boolean;

  phaseStartedAt: number | null;
  remainingMs: number | null;

  /**
   * Full duration (ms) of the current break phase, frozen when the break is
   * entered. Unlike play/move phases whose duration comes from the configured
   * play/move durations, a break's length can be dynamic (resume-time mode), so
   * it is captured here and used as the phase duration while the break runs.
   * Null outside of break phases.
   */
  breakDurationMs?: number | null;
};

/** Default warning threshold (seconds) when a state has none configured. */
export const DEFAULT_WARNING_SECONDS = 60;

export function getWarningSeconds(state: Pick<TimerState, "warningSeconds">) {
  return state.warningSeconds ?? DEFAULT_WARNING_SECONDS;
}
