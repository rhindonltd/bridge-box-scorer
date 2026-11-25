import { describe, it, expect } from "vitest";
import {
  buildConfiguredTimerState,
  getWarningSeconds,
  DEFAULT_WARNING_SECONDS,
} from "./timer-state";

describe("buildConfiguredTimerState", () => {
  it("builds a not-started, not-running state with null phase", () => {
    const state = buildConfiguredTimerState({
      boardsPerRound: 3,
      totalRounds: 8,
      playDuration: 420,
      moveDuration: 90,
    });

    expect(state.phase).toBeNull();
    expect(state.isRunning).toBe(false);
    expect(state.phaseStartedAt).toBeNull();
    expect(state.remainingMs).toBeNull();
    expect(state.breakDurationMs).toBeNull();
    expect(state.round).toBe(1);
    expect(state.board).toBe(1);
  });

  it("carries the configured durations and counts", () => {
    const state = buildConfiguredTimerState({
      boardsPerRound: 2,
      totalRounds: 10,
      playDuration: 300,
      moveDuration: 60,
    });

    expect(state.boardsPerRound).toBe(2);
    expect(state.totalRounds).toBe(10);
    expect(state.playDuration).toBe(300);
    expect(state.moveDuration).toBe(60);
  });

  it("defaults breaks to an empty array when omitted", () => {
    const state = buildConfiguredTimerState({
      boardsPerRound: 3,
      totalRounds: 8,
      playDuration: 420,
      moveDuration: 90,
    });

    expect(state.breaks).toEqual([]);
  });

  it("preserves provided breaks and warning seconds", () => {
    const breaks = [
      { afterRound: 4, mode: "duration" as const, durationSeconds: 600 },
    ];
    const state = buildConfiguredTimerState({
      boardsPerRound: 3,
      totalRounds: 8,
      playDuration: 420,
      moveDuration: 90,
      breaks,
      warningSeconds: 45,
    });

    expect(state.breaks).toEqual(breaks);
    expect(state.warningSeconds).toBe(45);
  });

  it("leaves warningSeconds undefined so the default applies downstream", () => {
    const state = buildConfiguredTimerState({
      boardsPerRound: 3,
      totalRounds: 8,
      playDuration: 420,
      moveDuration: 90,
    });

    expect(state.warningSeconds).toBeUndefined();
    expect(getWarningSeconds(state)).toBe(DEFAULT_WARNING_SECONDS);
  });
});
