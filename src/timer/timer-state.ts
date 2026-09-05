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

/**
 * Configuration for a timer, independent of any running state. This is what a
 * director edits during game setup: phase lengths, breaks, and warning
 * threshold. It carries no live/running fields.
 */
export interface TimerConfig {
  boardsPerRound: number;
  totalRounds: number;
  playDuration: number;
  moveDuration: number;
  breaks?: BreakConfig[];
  warningSeconds?: number;
}

/**
 * Build a "configured but not started" timer state from a {@link TimerConfig}.
 *
 * This represents a timer the director has set up during game setup but which
 * has not begun running: `phase` is `null` and `isRunning` is false, so the
 * scheduler will never advance it and clients render it as not-yet-started. It
 * is promoted to a live, running state when the game is started.
 */
export function buildConfiguredTimerState(config: TimerConfig): TimerState {
  return {
    version: 1,
    phase: null,
    board: 1,
    round: 1,
    boardsPerRound: config.boardsPerRound,
    totalRounds: config.totalRounds,
    playDuration: config.playDuration,
    moveDuration: config.moveDuration,
    breaks: config.breaks ?? [],
    warningSeconds: config.warningSeconds,
    isRunning: false,
    phaseStartedAt: null,
    remainingMs: null,
    breakDurationMs: null,
  };
}

/** Default warning threshold (seconds) when a state has none configured. */
export const DEFAULT_WARNING_SECONDS = 60;

export function getWarningSeconds(state: Pick<TimerState, "warningSeconds">) {
  return state.warningSeconds ?? DEFAULT_WARNING_SECONDS;
}
