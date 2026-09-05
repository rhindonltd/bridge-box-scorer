/** Shared view-model types for the director timer screens. */

/** Live status of a running/paused timer, as shown on the live screen. */
export interface TimerStatus {
  isRunning: boolean;
  phase: string | null;
  remaining: number;
  round: number | null;
  projectedEndDate: Date | null;
}

/** A break row as edited in the director UI. */
export interface BreakDraft {
  afterRound: number;
  mode: "duration" | "resumeTime";
  /** Duration mode: minutes. */
  durationMinutes: number;
  /** Resume-time mode: "HH:MM" local time string. */
  resumeAt: string;
  /** Human-readable computed length for resume-time mode (e.g. "12m"). */
  computedLength?: string | null;
}

/** The editable timer configuration shared by the config and live screens. */
export interface TimerConfig {
  boardsPerRound: number;
  totalRounds: number;
  playMinutes: number;
  playSeconds: number;
  moveMinutes: number;
  moveSeconds: number;
  timingMode: "perRound" | "perBoard";
  warningSeconds: number;
  breaks: BreakDraft[];
}

/** Handlers for editing the timer configuration. */
export interface TimerConfigHandlers {
  onConfigChange: (field: keyof TimerConfig, value: number | string) => void;
  onAddBreak: () => void;
  onRemoveBreak: (index: number) => void;
  onBreakChange: (
    index: number,
    field: keyof BreakDraft,
    value: number | string,
  ) => void;
}
