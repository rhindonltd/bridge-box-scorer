import { describe, it, expect } from "vitest";
import {
  breakAfterRound,
  gapPhaseAfterRound,
  resolveBreakDurationMs,
  projectPlayEndByRound,
  validateBreaks,
  validateStateBreaks,
} from "./breaks";
import type { BreakConfig, TimerState } from "./timer-state";

function makeState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    version: 1,
    phase: "play",
    board: 1,
    round: 1,
    boardsPerRound: 3,
    totalRounds: 5,
    playDuration: 420,
    moveDuration: 60,
    breaks: [],
    isRunning: false,
    phaseStartedAt: null,
    remainingMs: null,
    breakDurationMs: null,
    ...overrides,
  };
}

const durationBreak = (afterRound: number, minutes: number): BreakConfig => ({
  afterRound,
  mode: "duration",
  durationSeconds: minutes * 60,
});

const resumeBreak = (afterRound: number, resumeAtMs: number): BreakConfig => ({
  afterRound,
  mode: "resumeTime",
  resumeAtMs,
});

describe("breakAfterRound / gapPhaseAfterRound", () => {
  it("returns null / move when no break is scheduled", () => {
    const state = makeState({ breaks: [durationBreak(2, 10)] });
    expect(breakAfterRound(state, 1)).toBeNull();
    expect(gapPhaseAfterRound(state, 1)).toEqual({ kind: "move" });
  });

  it("returns the break / break gap when scheduled after that round", () => {
    const b = durationBreak(2, 10);
    const state = makeState({ breaks: [b] });
    expect(breakAfterRound(state, 2)).toEqual(b);
    expect(gapPhaseAfterRound(state, 2)).toEqual({ kind: "break", config: b });
  });

  it("treats missing breaks array as no breaks", () => {
    const state = makeState({ breaks: undefined });
    expect(breakAfterRound(state, 2)).toBeNull();
    expect(gapPhaseAfterRound(state, 2)).toEqual({ kind: "move" });
  });
});

describe("resolveBreakDurationMs", () => {
  it("returns the fixed length for duration-mode breaks", () => {
    expect(resolveBreakDurationMs(durationBreak(2, 10), 0)).toBe(600_000);
  });

  it("derives resume-time break length from prior play end", () => {
    const priorPlayEnd = 1_000_000;
    const resumeAt = priorPlayEnd + 5 * 60_000;
    expect(resolveBreakDurationMs(resumeBreak(2, resumeAt), priorPlayEnd)).toBe(
      300_000,
    );
  });

  it("clamps resume-time length to zero when play overruns the resume time", () => {
    const priorPlayEnd = 2_000_000;
    const resumeAt = priorPlayEnd - 60_000; // resume is before play ends
    expect(resolveBreakDurationMs(resumeBreak(2, resumeAt), priorPlayEnd)).toBe(
      0,
    );
  });
});

describe("projectPlayEndByRound", () => {
  it("projects each round's play end with move gaps only", () => {
    const now = 1_000_000;
    // play 420s, move 60s, 3 rounds
    const state = makeState({ totalRounds: 3, breaks: [] });
    const map = projectPlayEndByRound(state, now);

    // Round 1 play ends after 420s.
    expect(map.get(1)).toBe(now + 420_000);
    // Round 2 = +move(60) +play(420)
    expect(map.get(2)).toBe(now + 420_000 + 60_000 + 420_000);
    // Round 3 = another +move +play
    expect(map.get(3)).toBe(
      now + 420_000 + 60_000 + 420_000 + 60_000 + 420_000,
    );
  });

  it("includes break duration in place of move when a break is scheduled", () => {
    const now = 1_000_000;
    const state = makeState({
      totalRounds: 3,
      breaks: [durationBreak(1, 10)], // 600s break after round 1
    });
    const map = projectPlayEndByRound(state, now);

    expect(map.get(1)).toBe(now + 420_000);
    // Round 2 = +break(600) +play(420) instead of +move
    expect(map.get(2)).toBe(now + 420_000 + 600_000 + 420_000);
  });

  it("returns an empty map when finished", () => {
    const state = makeState({ phase: "finished" });
    expect(projectPlayEndByRound(state, Date.now()).size).toBe(0);
  });
});

describe("validateBreaks / validateStateBreaks", () => {
  it("reports no problems for duration breaks", () => {
    const state = makeState({ breaks: [durationBreak(2, 10)] });
    expect(validateBreaks(state, () => 0)).toEqual([]);
  });

  it("reports a problem when prior play is projected to end after the resume time", () => {
    const state = makeState({
      breaks: [resumeBreak(2, 1_000_000)],
    });
    // Prior play projected to end 30s after the resume time.
    const problems = validateBreaks(state, () => 1_030_000);
    expect(problems).toEqual([{ afterRound: 2, overrunMs: 30_000 }]);
  });

  it("reports no problem when the resume time is after prior play end", () => {
    const state = makeState({ breaks: [resumeBreak(2, 1_000_000)] });
    expect(validateBreaks(state, () => 900_000)).toEqual([]);
  });

  it("validateStateBreaks flags an overrunning resume-time break using the live projection", () => {
    const now = 1_000_000;
    // 3 rounds, play 420s move 60s; a resume-time break after round 1 whose
    // resume time is only 1s after now — round 1 play alone (420s) overruns it.
    const state = makeState({
      totalRounds: 3,
      breaks: [resumeBreak(1, now + 1_000)],
    });
    const problems = validateStateBreaks(state, now);
    expect(problems).toHaveLength(1);
    expect(problems[0].afterRound).toBe(1);
    expect(problems[0].overrunMs).toBeGreaterThan(0);
  });

  it("validateStateBreaks accepts a resume-time break that leaves room after play", () => {
    const now = 1_000_000;
    const state = makeState({
      totalRounds: 3,
      // Round 1 play ends at now+420s; resume 10 min after now leaves a break.
      breaks: [resumeBreak(1, now + 600_000)],
    });
    expect(validateStateBreaks(state, now)).toEqual([]);
  });
});
