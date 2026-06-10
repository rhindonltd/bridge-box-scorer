import { TimerState } from "@/timer/timer-state";

export function useTimerDerived(state: TimerState | null, now: number) {
  if (!state) {
    return {
      remaining: 0,
      phase: null,
      round: 0,
      boardLabel: null,
      title: "Connecting…",
    };
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

  const title =
    state.phase === "finished"
      ? "Session Complete"
      : state.phase === "play"
        ? `Round ${state.round} of ${state.totalRounds}`
        : `Move for Round ${state.round + 1}`;

  const boardLabel =
    state.phase === "play"
      ? `Board ${state.board + 1} of ${state.totalBoards}`
      : null;

  return {
    remaining,
    phase: state.phase,
    round: state.round,
    boardLabel,
    title,
    isRunning: state.isRunning,
  };
}
