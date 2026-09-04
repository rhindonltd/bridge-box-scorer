import { TimerState } from "@/timer/timer-state";
import { gapPhaseAfterRound, resolveBreakDurationMs } from "@/timer/breaks";

export class BridgeTimerEngine {
  private readonly state: TimerState;

  constructor(initial: TimerState) {
    this.state = initial;
  }

  getState(): TimerState {
    return { ...this.state };
  }

  /**
   * Duration (ms) of the current phase. For a break, this is the resolved
   * break duration frozen when the break was entered (stored in
   * `breakDurationMs`); if that is somehow absent we fall back to 0 so a break
   * never runs on the play/move duration by accident.
   */
  private getPhaseDurationMs() {
    if (this.state.phase === "break") {
      return this.state.breakDurationMs ?? 0;
    }

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
    this.state.phase = "play";
    this.state.round = 1;

    this.state.isRunning = false;

    this.state.phaseStartedAt = null;
    this.state.remainingMs = null;
    this.state.breakDurationMs = null;
  }

  /**
   * Enter a break as the gap after the current round. Freezes the resolved
   * break duration into `breakDurationMs`/`remainingMs`. `priorPlayEndMs` is
   * the wall-clock time (ms since epoch) at which the preceding play segment
   * ended — used to derive the length of resume-time breaks. Defaults to now.
   */
  private enterBreak(afterRound: number, priorPlayEndMs = Date.now()) {
    const gap = gapPhaseAfterRound(this.state, afterRound);

    // Caller must have confirmed a break exists after this round, so the gap is
    // always a break here; the `: 0` arm is defensive only.
    const durationMs =
      gap.kind === "break"
        ? resolveBreakDurationMs(gap.config, priorPlayEndMs)
        : /* v8 ignore next -- enterBreak is only called after nextPhase confirms a break */ 0;

    this.state.phase = "break";
    this.state.round += 1;

    this.state.phaseStartedAt = null;
    this.state.breakDurationMs = durationMs;
    this.state.remainingMs = durationMs;
    this.state.isRunning = false;
  }

  nextPhase() {
    const shouldContinue = this.state.isRunning;
    const priorPlayEndMs = Date.now();

    if (this.state.phase === "move" || this.state.phase === "break") {
      // Gap phase (move or break) always leads into the play phase for the
      // round we already advanced to when the gap was entered.
      this.state.phase = "play";

      this.state.phaseStartedAt = null;
      this.state.remainingMs = null;
      this.state.breakDurationMs = null;
      this.state.isRunning = false;

      if (shouldContinue) {
        this.start();
      }
      return;
    }

    // phase === "play"
    if (this.state.round >= this.state.totalRounds) {
      this.state.phase = "finished";

      this.state.isRunning = false;
      this.state.phaseStartedAt = null;
      this.state.remainingMs = null;

      return;
    }

    // A break scheduled after the current round replaces the move gap.
    const gap = gapPhaseAfterRound(this.state, this.state.round);

    if (gap.kind === "break") {
      this.enterBreak(this.state.round, priorPlayEndMs);

      if (shouldContinue) {
        this.start();
      }
      return;
    }

    this.state.round += 1;
    this.state.phase = "move";

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

  /**
   * Restart the current phase from its full duration, leaving it paused. Used
   * as the first press of "Previous".
   */
  restartPhase() {
    if (this.state.phase === "finished") {
      return;
    }

    this.state.isRunning = false;
    this.state.phaseStartedAt = null;

    if (this.state.phase === "break") {
      // Recompute the break length as if the preceding play had just ended.
      const gap = gapPhaseAfterRound(this.state, this.state.round - 1);
      const durationMs =
        gap.kind === "break"
          ? resolveBreakDurationMs(gap.config, Date.now())
          : 0;
      this.state.breakDurationMs = durationMs;
      this.state.remainingMs = durationMs;
      return;
    }

    this.state.remainingMs =
      (this.state.phase === "move"
        ? this.state.moveDuration
        : this.state.playDuration) * 1000;
  }

  /**
   * Step back to the phase preceding the current one, restarted and paused.
   * The gap before a play phase is the break/move after the previous round;
   * the phase before a gap is the play of the previous round.
   */
  previousPhase() {
    const shouldContinue = this.state.isRunning;
    this.state.isRunning = false;
    this.state.phaseStartedAt = null;
    this.state.remainingMs = null;

    if (this.state.phase === "finished") {
      // Step back into the final round's play.
      this.state.phase = "play";
      this.state.breakDurationMs = null;
      this.restartPhase();
      if (shouldContinue) this.start();
      return;
    }

    if (this.state.phase === "move" || this.state.phase === "break") {
      // The gap follows the previous round's play. Step back to that play,
      // decrementing round to that previous round.
      this.state.round = Math.max(1, this.state.round - 1);
      this.state.phase = "play";
      this.state.breakDurationMs = null;
      this.restartPhase();
      if (shouldContinue) this.start();
      return;
    }

    // phase === "play"
    if (this.state.round <= 1) {
      // Already at the first play; just restart it.
      this.restartPhase();
      if (shouldContinue) this.start();
      return;
    }

    // Step back into the gap (break or move) that precedes this play. That gap
    // is the one after the previous round.
    const previousRound = this.state.round - 1;
    const gap = gapPhaseAfterRound(this.state, previousRound);

    if (gap.kind === "break") {
      const durationMs = resolveBreakDurationMs(gap.config, Date.now());
      this.state.phase = "break";
      this.state.breakDurationMs = durationMs;
      this.state.remainingMs = durationMs;
    } else {
      this.state.phase = "move";
      this.state.breakDurationMs = null;
      this.state.remainingMs = this.state.moveDuration * 1000;
    }

    if (shouldContinue) this.start();
  }

  /**
   * Adjust the remaining time of the current phase by `deltaMs` (may be
   * negative). When `applyToFutureSameType` is true and the current phase is a
   * play or move phase, the corresponding stored duration is adjusted too so
   * all subsequent phases of that same type inherit the change. Phases that
   * have already elapsed are never touched (only the stored duration, which
   * governs future phases, changes).
   */
  adjustTime(deltaMs: number, applyToFutureSameType = false) {
    if (this.state.phase === "finished" || this.state.phase == null) {
      return;
    }

    // Adjust the current phase's remaining time.
    const currentRemaining = this.getRemainingMs();
    const newRemaining = Math.max(0, currentRemaining + deltaMs);

    if (this.state.phase === "break") {
      // A break's phase duration IS its (dynamic) length, so grow/shrink it by
      // the same delta and keep remaining consistent.
      const newBreakDuration = Math.max(
        0,
        (this.state.breakDurationMs ?? 0) + deltaMs,
      );
      this.state.breakDurationMs = newBreakDuration;
      if (this.state.isRunning) {
        this.state.remainingMs = null;
        this.state.phaseStartedAt =
          Date.now() - (newBreakDuration - newRemaining);
      } else {
        this.state.remainingMs = newRemaining;
      }
      return;
    }

    if (this.state.isRunning) {
      // Re-anchor phaseStartedAt so the running countdown reflects the new
      // remaining against the (possibly changed) phase duration.
      this.state.remainingMs = null;
    } else {
      this.state.remainingMs = newRemaining;
    }

    if (applyToFutureSameType && this.state.phase === "play") {
      this.state.playDuration = Math.max(
        0,
        this.state.playDuration + Math.round(deltaMs / 1000),
      );
    } else if (applyToFutureSameType && this.state.phase === "move") {
      this.state.moveDuration = Math.max(
        0,
        this.state.moveDuration + Math.round(deltaMs / 1000),
      );
    }

    if (this.state.isRunning) {
      // Back-date phaseStartedAt against the (new) phase duration so the
      // running remaining equals newRemaining.
      this.state.phaseStartedAt =
        Date.now() - (this.getPhaseDurationMs() - newRemaining);
    }
  }

  updateConfig(
    boardsPerRound: number,
    totalRounds: number,
    playDuration: number,
    moveDuration: number,
    options?: {
      breaks?: TimerState["breaks"];
      warningSeconds?: number;
    },
  ) {
    this.state.boardsPerRound = boardsPerRound;
    this.state.totalRounds = totalRounds;

    if (options && options.breaks !== undefined) {
      this.state.breaks = options.breaks;
    }

    if (options && typeof options.warningSeconds === "number") {
      this.state.warningSeconds = options.warningSeconds;
    }

    const currentDuration =
      this.state.phase === "play"
        ? this.state.playDuration
        : this.state.moveDuration;

    const newDuration =
      this.state.phase === "play"
        ? (playDuration ?? this.state.playDuration)
        : (moveDuration ?? this.state.moveDuration);

    // Recompute remaining time so an in-flight phase reflects the new duration,
    // whether paused (adjust the frozen remainingMs) or running (re-anchor
    // phaseStartedAt). Break phases keep their frozen break duration untouched.
    if (this.state.phase === "play" || this.state.phase === "move") {
      if (!this.state.isRunning && this.state.remainingMs != null) {
        const elapsedMs = currentDuration * 1000 - this.state.remainingMs;
        this.state.remainingMs = Math.max(0, newDuration * 1000 - elapsedMs);
      } else if (this.state.isRunning && this.state.phaseStartedAt != null) {
        const elapsedMs = Date.now() - this.state.phaseStartedAt;
        const newRemaining = Math.max(0, newDuration * 1000 - elapsedMs);
        // Re-anchor against the new duration.
        this.state.phaseStartedAt =
          Date.now() - (newDuration * 1000 - newRemaining);
      }
    }

    if (playDuration != null) {
      this.state.playDuration = playDuration;
    }

    if (moveDuration != null) {
      this.state.moveDuration = moveDuration;
    }
  }
}
