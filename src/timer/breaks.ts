import { BreakConfig, TimerState } from "@/timer/timer-state";

/**
 * The kind of phase that occupies the gap after a round: either a normal
 * `move` phase or a `break` that replaces it.
 */
export type GapPhase =
  | { kind: "move" }
  | { kind: "break"; config: BreakConfig };

/**
 * Return the break configured after the given round, if any. When multiple
 * breaks share the same `afterRound` (which should not happen for valid
 * config) the first is returned.
 */
export function breakAfterRound(
  state: Pick<TimerState, "breaks">,
  round: number,
): BreakConfig | null {
  const breaks = state.breaks ?? [];
  return breaks.find((b) => b.afterRound === round) ?? null;
}

/**
 * Determine what occupies the gap after the given round: a break (if one is
 * scheduled there) or the default move phase.
 */
export function gapPhaseAfterRound(
  state: Pick<TimerState, "breaks">,
  round: number,
): GapPhase {
  const config = breakAfterRound(state, round);
  return config ? { kind: "break", config } : { kind: "move" };
}

/**
 * Resolve the effective duration (in milliseconds) of a break, given the
 * projected wall-clock time (ms since epoch) at which the preceding play
 * segment is expected to end.
 *
 * - Duration-mode breaks return their fixed length.
 * - Resume-time-mode breaks return `resumeAtMs - priorPlayEndMs`, clamped to a
 *   minimum of 0 so a break never reports a negative length. Whether that
 *   clamp represents an invalid state is decided separately by
 *   {@link validateBreaks}; this function only computes the number used for
 *   countdown and finish-time math.
 */
export function resolveBreakDurationMs(
  config: BreakConfig,
  priorPlayEndMs: number,
): number {
  if (config.mode === "duration") {
    return Math.max(0, config.durationSeconds * 1000);
  }

  return Math.max(0, config.resumeAtMs - priorPlayEndMs);
}

/**
 * Project the wall-clock time (ms since epoch) at which the play segment
 * ending each round is expected to finish, starting from a given clock time.
 * Walks the session from the current phase/round forward, accumulating play,
 * move, and break durations. Resume-time breaks are resolved against the
 * projected start of their own gap.
 *
 * Returns a map from round number to the projected end (ms) of that round's
 * play segment. Only rounds from the current position onward are included.
 */
export function projectPlayEndByRound(
  state: TimerState,
  now: number,
): Map<number, number> {
  const result = new Map<number, number>();

  if (state.phase === "finished" || state.phase == null) {
    return result;
  }

  const playMs = state.playDuration * 1000;
  const moveMs = state.moveDuration * 1000;

  function remainingCurrentPhaseMs(): number {
    if (!state.isRunning) {
      if (state.phase === "break") {
        return state.breakDurationMs ?? state.remainingMs ?? 0;
      }
      return state.remainingMs ?? (state.phase === "play" ? playMs : moveMs);
    }
    const elapsed = now - (state.phaseStartedAt ?? now);
    const phaseDurationMs =
      state.phase === "play"
        ? playMs
        : state.phase === "move"
          ? moveMs
          : (state.breakDurationMs ?? state.remainingMs ?? 0);
    return Math.max(0, phaseDurationMs - elapsed);
  }

  let cursor = now;

  if (state.phase === "play") {
    cursor += remainingCurrentPhaseMs();
    result.set(state.round, cursor);
    for (let round = state.round; round < state.totalRounds; round++) {
      const gap = gapPhaseAfterRound(state, round);
      cursor +=
        gap.kind === "break"
          ? resolveBreakDurationMs(gap.config, cursor)
          : moveMs;
      cursor += playMs;
      result.set(round + 1, cursor);
    }
    return result;
  }

  // move or break: the current gap precedes the play for state.round.
  cursor += remainingCurrentPhaseMs();
  cursor += playMs;
  result.set(state.round, cursor);
  for (let round = state.round; round < state.totalRounds; round++) {
    const gap = gapPhaseAfterRound(state, round);
    cursor +=
      gap.kind === "break" ? resolveBreakDurationMs(gap.config, cursor) : moveMs;
    cursor += playMs;
    result.set(round + 1, cursor);
  }
  return result;
}

export type BreakProblem = {
  afterRound: number;
  /**
   * How far (ms) the preceding play segment is projected to overrun the break's
   * resume time. Always positive for a reported problem.
   */
  overrunMs: number;
};

/**
 * Validate resume-time breaks against the projected end of their preceding
 * play segment. A break is invalid when its preceding play is projected to end
 * *after* the break's resume time, which would require a negative break.
 *
 * The caller supplies a function mapping a break's `afterRound` to the
 * projected wall-clock end (ms since epoch) of the play segment that precedes
 * it. Duration-mode breaks are always valid.
 *
 * Returns a structured list of problems for the director to resolve (remove
 * the break or change its timing). The system never silently zeroes an invalid
 * break.
 */
export function validateBreaks(
  state: Pick<TimerState, "breaks">,
  priorPlayEndForRound: (afterRound: number) => number,
): BreakProblem[] {
  const breaks = state.breaks ?? [];
  const problems: BreakProblem[] = [];

  for (const config of breaks) {
    if (config.mode !== "resumeTime") {
      continue;
    }

    const priorPlayEndMs = priorPlayEndForRound(config.afterRound);
    const overrunMs = priorPlayEndMs - config.resumeAtMs;

    if (overrunMs > 0) {
      problems.push({ afterRound: config.afterRound, overrunMs });
    }
  }

  return problems;
}

/**
 * Validate a timer state's resume-time breaks against a live projection of when
 * each preceding play segment is expected to end. Convenience wrapper combining
 * {@link projectPlayEndByRound} and {@link validateBreaks}.
 */
export function validateStateBreaks(
  state: TimerState,
  now: number,
): BreakProblem[] {
  const projected = projectPlayEndByRound(state, now);
  return validateBreaks(state, (afterRound) => projected.get(afterRound) ?? now);
}
