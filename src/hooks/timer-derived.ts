import { TimerState } from "@/timer/timer-state";

export function useTimerDerived(state: TimerState | null, now: number) {
  if (!state) {
    return {
      remaining: 0,
      phase: null,
      boardLabel: null,
      title: "Connecting…",
      isRunning: false,
      projectedEndDate: new Date(),
    };
  }

  function computeRemainingSessionMs(now = Date.now()): number {
    if (!state || state.phase === "finished") {
      return 0;
    }

    const playMs = state.playDuration * 1000;
    const moveMs = state.moveDuration * 1000;

    let remainingCurrentPhaseMs: number;

    if (!state.isRunning) {
      remainingCurrentPhaseMs =
        state.remainingMs ?? (state.phase === "play" ? playMs : moveMs);
    } else {
      const elapsed = now - state.phaseStartedAt!;

      const phaseDurationMs = state.phase === "play" ? playMs : moveMs;

      remainingCurrentPhaseMs = Math.max(0, phaseDurationMs - elapsed);
    }

    const futureRounds = state.totalRounds - state.round;

    if (state.phase === "play") {
      // After current play: (futureRounds) move phases + (futureRounds) play phases
      return (
        remainingCurrentPhaseMs + futureRounds * playMs + futureRounds * moveMs
      );
    }

    // phase === "move"
    // After current move: the play phase for this round still needs to happen,
    // plus all subsequent round pairs (move + play). That's:
    // (futureRounds + 1) play phases + (futureRounds) move phases
    return (
      remainingCurrentPhaseMs +
      (futureRounds + 1) * playMs +
      futureRounds * moveMs
    );
  }

  const getRemaining = () => {
    if (state.phase === "finished") return 0;

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

  const sessionRemainingMs = computeRemainingSessionMs();
  const projectedEnd = sessionRemainingMs ? now + sessionRemainingMs : now;
  const projectedEndDate = new Date(projectedEnd);

  const title =
    state.phase === "finished"
      ? "Session Complete"
      : state.phase === "break"
        ? "Break"
        : state.phase === "play"
          ? `Round ${state.round} of ${state.totalRounds}`
          : `Move for Round ${state.round}`;

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
  };
}
