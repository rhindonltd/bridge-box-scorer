import { TimerState, getWarningSeconds } from "@/timer/timer-state";
import { gapPhaseAfterRound, resolveBreakDurationMs } from "@/timer/breaks";

export function useTimerDerived(state: TimerState | null, now: number) {
  if (!state) {
    return {
      remaining: 0,
      phase: null,
      round: null,
      boardLabel: null,
      title: "Connecting…",
      isRunning: false,
      projectedEndDate: new Date(),
      warningSeconds: 60,
    };
  }

  const playMs = state.playDuration * 1000;
  const moveMs = state.moveDuration * 1000;

  // Milliseconds occupied by the gap after `round` (break replaces move).
  // Resume-time breaks are resolved against `gapStartMs`, the projected
  // wall-clock time at which that gap begins.
  function gapMsAfterRound(round: number, gapStartMs: number): number {
    const gap = gapPhaseAfterRound(state!, round);
    if (gap.kind === "break") {
      return resolveBreakDurationMs(gap.config, gapStartMs);
    }
    return moveMs;
  }

  function computeRemainingSessionMs(clock: number): number {
    if (!state || state.phase === "finished") {
      return 0;
    }

    // A Swiss timer between rounds has no fixed remaining session — the next
    // round starts whenever the director draws it — so there is no projected
    // end time to compute.
    if (state.phase === "awaitingDraw") {
      return 0;
    }

    // Before the game is started the timer is configured but not yet running
    // (phase `null`): it is about to begin round `state.round` (1) in play, so
    // treat it exactly like the start of a play phase for the projected-end
    // walk. Without this the session total collapses to 0 and the projected
    // end shows the current time.
    const phase = state.phase ?? "play";

    let remainingCurrentPhaseMs: number;

    if (!state.isRunning) {
      remainingCurrentPhaseMs =
        state.remainingMs ??
        (phase === "move" ? moveMs : playMs);
    } else {
      const elapsed = clock - state.phaseStartedAt!;
      const phaseDurationMs =
        phase === "play"
          ? playMs
          : phase === "move"
            ? moveMs
            : (state.remainingMs ?? 0);
      remainingCurrentPhaseMs = Math.max(0, phaseDurationMs - elapsed);
    }

    // Walk forward from the current position, accumulating remaining time and
    // tracking the projected wall-clock cursor so resume-time breaks resolve
    // against the projected start of their gap.
    let total = remainingCurrentPhaseMs;
    let cursor = clock + remainingCurrentPhaseMs;

    if (phase === "play") {
      // The gap after the current round, then every subsequent round.
      for (let round = state.round; round < state.totalRounds; round++) {
        const gap = gapMsAfterRound(round, cursor);
        total += gap;
        cursor += gap;
        total += playMs;
        cursor += playMs;
      }
      return total;
    }

    if (phase === "move" || phase === "break") {
      // The current gap belongs to the round after the previous play; the play
      // for `state.round` still needs to happen, then subsequent rounds.
      total += playMs;
      cursor += playMs;
      for (let round = state.round; round < state.totalRounds; round++) {
        const gap = gapMsAfterRound(round, cursor);
        total += gap;
        cursor += gap;
        total += playMs;
        cursor += playMs;
      }
      return total;
    }

    return total;
  }

  const getRemaining = () => {
    if (state.phase === "finished") return 0;

    // `awaitingDraw` is open-ended — there is no countdown to show.
    if (state.phase === "awaitingDraw") return 0;

    if (state.phase === "break") {
      if (!state.isRunning) {
        return Math.ceil((state.remainingMs ?? 0) / 1000);
      }
      if (!state.phaseStartedAt) return Math.ceil((state.remainingMs ?? 0) / 1000);
      const durationMs = state.remainingMs ?? 0;
      const elapsed = now - state.phaseStartedAt;
      return Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
    }

    const duration =
      state.phase === "move" ? state.moveDuration : state.playDuration;

    if (!state.isRunning) {
      if (state.remainingMs != null) {
        return Math.ceil(state.remainingMs / 1000);
      }
      return duration;
    }

    if (!state.phaseStartedAt) return duration;

    const elapsed = Math.floor((now - state.phaseStartedAt) / 1000);

    return Math.max(0, duration - elapsed);
  };

  const remaining = getRemaining();

  const sessionRemainingMs = computeRemainingSessionMs(now);
  const projectedEnd = sessionRemainingMs ? now + sessionRemainingMs : now;
  const projectedEndDate = new Date(projectedEnd);

  const title =
    state.phase === "finished"
      ? "Session Complete"
      : state.phase === "break"
        ? "Break"
        : state.phase === "awaitingDraw"
          ? "Waiting for next round"
          : state.phase === "move"
            ? // A move only ever leads INTO the next round, so this is always
              // round ≥ 2 — round 1 begins in play with no preceding move.
              `Move for Round ${state.round}`
            : // play, or the configured-but-not-started (`null`) phase the
              // display briefly holds at the very start: show the round label
              // rather than defaulting to "Move for Round 1".
              `Round ${state.round} of ${state.totalRounds}`;

  const boardLabel =
    state.phase === "play"
      ? `Board ${state.board} of ${state.boardsPerRound}`
      : null;

  return {
    remaining,
    phase: state.phase,
    round: state.round,
    boardLabel,
    title,
    isRunning: state.isRunning,
    projectedEndDate,
    warningSeconds: getWarningSeconds(state),
  };
}
