export type Phase = "move" | "play" | "finished";

export type TimerState = {
  version: number;
  phase: Phase;

  board: number;
  round: number;

  totalBoards: number;
  totalRounds: number;

  playDuration: number;
  moveDuration: number;

  isRunning: boolean;

  phaseStartedAt: number | null;
  remainingMs: number | null;
};
