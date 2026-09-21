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

  // --- Shared low-level state mutations ---------------------------------
  //
  // Every phase transition manipulates the same four runtime fields
  // (isRunning / phaseStartedAt / remainingMs / breakDurationMs). Centralising
  // them here keeps each transition method describing *what* it does rather
  // than re-implementing the field bookkeeping by hand.

  /**
   * Clear the runtime fields to the "paused, not yet started" baseline. When
   * `clearBreakDuration` is true the frozen break length is dropped too (used
   * whenever we leave, or step away from, a break phase).
   */
  private clearRuntimeFields(clearBreakDuration = true) {
    this.state.isRunning = false;
    this.state.phaseStartedAt = null;
    this.state.remainingMs = null;
    if (clearBreakDuration) {
      this.state.breakDurationMs = null;
    }
  }

  /**
   * Back-date `phaseStartedAt` so that a running countdown reports exactly
   * `remainingMs` against the current phase duration. This is the "pretend we
   * started earlier" trick, shared by start/adjust/config so the arithmetic
   * lives in one place.
   */
  private reanchorTo(remainingMs: number) {
    this.state.remainingMs = null;
    this.state.phaseStartedAt =
      Date.now() - (this.getPhaseDurationMs() - remainingMs);
  }

  /**
   * Resolve the break duration (ms) for the gap after `afterRound`, or null
   * when that gap is not a break. `priorPlayEndMs` is the wall-clock time the
   * preceding play ended (governs resume-time breaks); defaults to now.
   */
  private breakDurationAfter(
    afterRound: number,
    priorPlayEndMs = Date.now(),
  ): number | null {
    const gap = gapPhaseAfterRound(this.state, afterRound);
    return gap.kind === "break"
      ? resolveBreakDurationMs(gap.config, priorPlayEndMs)
      : null;
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
    this.reanchorTo(remaining);
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
    this.clearRuntimeFields();
  }

  /**
   * Enter a break as the gap after the current round. Freezes the resolved
   * break duration into `breakDurationMs`/`remainingMs`. `priorPlayEndMs` is
   * the wall-clock time (ms since epoch) at which the preceding play segment
   * ended — used to derive the length of resume-time breaks. Defaults to now.
   */
  /* v8 ignore next -- the sole caller (nextPhase) always passes priorPlayEndMs, so the Date.now() default is never evaluated */
  private enterBreak(afterRound: number, priorPlayEndMs = Date.now()) {
    // Caller must have confirmed a break exists after this round, so the gap is
    // always a break here; the `?? 0` arm is defensive only.
    const durationMs =
      this.breakDurationAfter(afterRound, priorPlayEndMs) ??
      /* v8 ignore next -- enterBreak is only called after nextPhase confirms a break */ 0;

    this.state.phase = "break";
    this.state.round += 1;

    this.clearRuntimeFields();
    this.state.breakDurationMs = durationMs;
    this.state.remainingMs = durationMs;
  }

  /** Transition into the play phase of the round already advanced to. */
  private enterPlay() {
    this.state.phase = "play";
    this.clearRuntimeFields();
  }

  /** Transition into the terminal finished phase. */
  private finish() {
    this.state.phase = "finished";
    this.clearRuntimeFields(false);
  }

  nextPhase() {
    const shouldContinue = this.state.isRunning;
    const priorPlayEndMs = Date.now();

    if (this.state.phase === "move" || this.state.phase === "break") {
      // Gap phase (move or break) always leads into the play phase for the
      // round we already advanced to when the gap was entered.
      this.enterPlay();

      if (shouldContinue) {
        this.start();
      }
      return;
    }

    // phase === "play"
    if (this.state.round >= this.state.totalRounds) {
      this.finish();
      return;
    }

    // A break scheduled after the current round replaces the move gap.
    if (this.breakDurationAfter(this.state.round) != null) {
      this.enterBreak(this.state.round, priorPlayEndMs);

      if (shouldContinue) {
        this.start();
      }
      return;
    }

    this.state.round += 1;
    this.state.phase = "move";
    this.clearRuntimeFields();

    if (shouldContinue) {
      this.start();
    }
  }

  skipRound() {
    if (this.state.round >= this.state.totalRounds) {
      this.finish();
      return;
    }

    this.state.round += 1;
    this.state.phase = "move";
    this.clearRuntimeFields();
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
      const durationMs = this.breakDurationAfter(this.state.round - 1) ?? 0;
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
    this.clearRuntimeFields(false);

    this.stepToPreviousPhase();

    // Every branch above leaves the target phase set up and paused; resume it
    // only if the timer was running when we stepped back.
    if (shouldContinue) this.start();
  }

  /**
   * Set state to the phase preceding the current one (paused). Split out from
   * {@link previousPhase} so the "resume if it was running" tail lives in one
   * place rather than being repeated in every branch.
   */
  private stepToPreviousPhase() {
    if (this.state.phase === "finished") {
      // Step back into the final round's play.
      this.state.phase = "play";
      this.state.breakDurationMs = null;
      this.restartPhase();
      return;
    }

    if (this.state.phase === "move" || this.state.phase === "break") {
      // The gap follows the previous round's play. Step back to that play,
      // decrementing round to that previous round.
      this.state.round = Math.max(1, this.state.round - 1);
      this.state.phase = "play";
      this.state.breakDurationMs = null;
      this.restartPhase();
      return;
    }

    // phase === "play"
    if (this.state.round <= 1) {
      // Already at the first play; just restart it.
      this.restartPhase();
      return;
    }

    // Step back into the gap (break or move) that precedes this play. That gap
    // is the one after the previous round.
    const breakDurationMs = this.breakDurationAfter(this.state.round - 1);

    if (breakDurationMs != null) {
      this.state.phase = "break";
      this.state.breakDurationMs = breakDurationMs;
      this.state.remainingMs = breakDurationMs;
    } else {
      this.state.phase = "move";
      this.state.breakDurationMs = null;
      this.state.remainingMs = this.state.moveDuration * 1000;
    }
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
        this.reanchorTo(newRemaining);
      } else {
        this.state.remainingMs = newRemaining;
      }
      return;
    }

    if (!this.state.isRunning) {
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
      // Re-anchor against the (possibly changed) phase duration so the running
      // remaining equals newRemaining.
      this.reanchorTo(newRemaining);
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
      timingMode?: TimerState["timingMode"];
    },
  ) {
    // How long the current play/move phase was before this config change; used
    // below to recompute how much of it has elapsed. Read BEFORE the new
    // durations are stored.
    const oldPhaseDuration =
      this.state.phase === "play"
        ? this.state.playDuration
        : this.state.moveDuration;

    // A null duration means "keep the existing value" (callers pass null to
    // change other config without touching a duration).
    const nextPlayDuration = playDuration ?? this.state.playDuration;
    const nextMoveDuration = moveDuration ?? this.state.moveDuration;

    // 1. Apply the new config fields (durations + optional settings) up front,
    //    so the re-anchor step below reads the new duration directly rather
    //    than juggling the write order.
    this.state.boardsPerRound = boardsPerRound;
    this.state.totalRounds = totalRounds;
    this.state.playDuration = nextPlayDuration;
    this.state.moveDuration = nextMoveDuration;

    if (options?.breaks !== undefined) {
      this.state.breaks = options.breaks;
    }
    if (typeof options?.warningSeconds === "number") {
      this.state.warningSeconds = options.warningSeconds;
    }
    if (options?.timingMode !== undefined) {
      this.state.timingMode = options.timingMode;
    }

    // 2. Re-anchor an in-flight play/move phase to the new duration, preserving
    //    how much has already elapsed. A break keeps its frozen duration and a
    //    finished timer has nothing to re-anchor, so both are left untouched.
    if (this.state.phase !== "play" && this.state.phase !== "move") return;

    const newPhaseDuration =
      this.state.phase === "play" ? nextPlayDuration : nextMoveDuration;

    if (!this.state.isRunning && this.state.remainingMs != null) {
      // Paused: shift the frozen remaining by the change in phase length.
      const elapsedMs = oldPhaseDuration * 1000 - this.state.remainingMs;
      this.state.remainingMs = Math.max(0, newPhaseDuration * 1000 - elapsedMs);
    } else if (this.state.isRunning && this.state.phaseStartedAt != null) {
      // Running: recompute remaining from real elapsed time and re-anchor.
      const elapsedMs = Date.now() - this.state.phaseStartedAt;
      this.reanchorTo(Math.max(0, newPhaseDuration * 1000 - elapsedMs));
    }
  }
}
