import { TimerState } from "@/timer/timer-state";

export class BridgeTimerEngine {
  private readonly state: TimerState;

  constructor(initial: TimerState) {
    this.state = initial;
  }

  getState(): TimerState {
    return { ...this.state };
  }

  private getPhaseDurationMs() {
    return (
      (this.state.phase === "move"
        ? this.state.moveDuration
        : this.state.playDuration) * 1000
    );
  }

  /**
   * Current remaining time.
   */
  getRemainingMs(now = Date.now()) {
    if (!this.state.isRunning) {
      return this.state.remainingMs ?? this.getPhaseDurationMs();
    }

    if (!this.state.phaseStartedAt) {
      return this.getPhaseDurationMs();
    }

    const elapsed = now - this.state.phaseStartedAt;

    return Math.max(0, this.getPhaseDurationMs() - elapsed);
  }

  /**
   * Start from beginning OR resume from pause.
   */
  start() {
    if (this.state.phase === "finished") {
      return;
    }

    if (this.state.isRunning) {
      return;
    }

    const remaining = this.state.remainingMs ?? this.getPhaseDurationMs();

    this.state.isRunning = true;

    /**
     * Pretend we started earlier so that:
     *
     * remaining =
     * duration - (now - phaseStartedAt)
     */
    this.state.phaseStartedAt =
      Date.now() - (this.getPhaseDurationMs() - remaining);

    this.state.remainingMs = null;
  }

  pause() {
    if (!this.state.isRunning) {
      return;
    }

    this.state.remainingMs = this.getRemainingMs();

    this.state.isRunning = false;
    this.state.phaseStartedAt = null;
  }

  reset() {
    this.state.phase = "move";
    this.state.round = 1;

    this.state.isRunning = false;

    this.state.phaseStartedAt = null;
    this.state.remainingMs = null;
  }

  nextPhase() {
    const shouldContinue = this.state.isRunning;

    if (this.state.phase === "move") {
      this.state.phase = "play";
    } else {
      if (this.state.round >= this.state.totalRounds) {
        this.state.phase = "finished";

        this.state.isRunning = false;
        this.state.phaseStartedAt = null;
        this.state.remainingMs = null;

        return;
      }

      this.state.round += 1;
      this.state.phase = "move";
    }

    this.state.phaseStartedAt = null;
    this.state.remainingMs = null;
    this.state.isRunning = false;

    if (shouldContinue) {
      this.start();
    }
  }

  skipRound() {
    if (this.state.round >= this.state.totalRounds) {
      this.state.phase = "finished";

      this.state.isRunning = false;
      this.state.phaseStartedAt = null;
      this.state.remainingMs = null;

      return;
    }

    this.state.round += 1;

    this.state.phase = "move";

    this.state.isRunning = false;
    this.state.phaseStartedAt = null;
    this.state.remainingMs = null;
  }

  updateConfig(
    cfg: Partial<{
      playDuration: number;
      moveDuration: number;
    }>,
  ) {
    if (cfg.playDuration != null) {
      this.state.playDuration = cfg.playDuration;
    }

    if (cfg.moveDuration != null) {
      this.state.moveDuration = cfg.moveDuration;
    }
  }
}
