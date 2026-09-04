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

describe("projectPlayEndByRound — running phases and non-play current phase", () => {
  it("returns an empty map when phase is null", () => {
    const state = makeState({ phase: null as unknown as TimerState["phase"] });
    expect(projectPlayEndByRound(state, 1_000_000).size).toBe(0);
  });

  it("uses elapsed time against playMs while running in the play phase", () => {
    const now = 1_000_000;
    // Running, started 100s ago; 420s play => 320s remain for round 1.
    const state = makeState({
      phase: "play",
      isRunning: true,
      phaseStartedAt: now - 100_000,
      totalRounds: 1,
    });
    const map = projectPlayEndByRound(state, now);
    expect(map.get(1)).toBe(now + 320_000);
  });

  it("uses remainingMs when the play phase is paused and remainingMs is set", () => {
    const now = 1_000_000;
    const state = makeState({
      phase: "play",
      isRunning: false,
      remainingMs: 120_000,
      totalRounds: 1,
    });
    const map = projectPlayEndByRound(state, now);
    // Paused with 120s left on the current play segment.
    expect(map.get(1)).toBe(now + 120_000);
  });

  it("projects from a paused MOVE phase: current gap precedes state.round's play", () => {
    const now = 1_000_000;
    // Paused in a move gap before round 2, remainingMs 30s; then play 420s.
    const state = makeState({
      phase: "move",
      isRunning: false,
      remainingMs: 30_000,
      round: 2,
      totalRounds: 3,
    });
    const map = projectPlayEndByRound(state, now);
    // Round 2 play ends after remaining move (30s) + play (420s).
    expect(map.get(2)).toBe(now + 30_000 + 420_000);
    // Round 3 = +move(60) +play(420).
    expect(map.get(3)).toBe(now + 30_000 + 420_000 + 60_000 + 420_000);
  });

  it("projects from a paused MOVE phase falling back to moveMs when remainingMs is null", () => {
    const now = 1_000_000;
    const state = makeState({
      phase: "move",
      isRunning: false,
      remainingMs: null,
      round: 2,
      totalRounds: 2,
    });
    const map = projectPlayEndByRound(state, now);
    // Falls back to full moveMs (60s) + play (420s).
    expect(map.get(2)).toBe(now + 60_000 + 420_000);
  });

  it("projects from a running MOVE phase using elapsed against moveMs", () => {
    const now = 1_000_000;
    const state = makeState({
      phase: "move",
      isRunning: true,
      phaseStartedAt: now - 20_000, // 40s of the 60s move remain
      round: 2,
      totalRounds: 2,
    });
    const map = projectPlayEndByRound(state, now);
    expect(map.get(2)).toBe(now + 40_000 + 420_000);
  });

  it("projects from a paused BREAK phase using breakDurationMs (line 85)", () => {
    const now = 1_000_000;
    const state = makeState({
      phase: "break",
      isRunning: false,
      breakDurationMs: 200_000,
      round: 2,
      totalRounds: 2,
    });
    const map = projectPlayEndByRound(state, now);
    // Remaining break (200s) + play (420s).
    expect(map.get(2)).toBe(now + 200_000 + 420_000);
  });

  it("projects from a paused BREAK phase falling back to remainingMs then 0", () => {
    const now = 1_000_000;
    // breakDurationMs null, remainingMs null => 0 remaining on the break.
    const state = makeState({
      phase: "break",
      isRunning: false,
      breakDurationMs: null,
      remainingMs: null,
      round: 2,
      totalRounds: 2,
    });
    const map = projectPlayEndByRound(state, now);
    expect(map.get(2)).toBe(now + 0 + 420_000);
  });

  it("projects from a running BREAK phase using elapsed against breakDurationMs", () => {
    const now = 1_000_000;
    const state = makeState({
      phase: "break",
      isRunning: true,
      phaseStartedAt: now - 50_000,
      breakDurationMs: 300_000, // 250s remain
      round: 2,
      totalRounds: 2,
    });
    const map = projectPlayEndByRound(state, now);
    expect(map.get(2)).toBe(now + 250_000 + 420_000);
  });

  it("uses a scheduled break for the gap after the current round in the non-play branch", () => {
    const now = 1_000_000;
    const state = makeState({
      phase: "move",
      isRunning: false,
      remainingMs: 0,
      round: 1,
      totalRounds: 2,
      breaks: [durationBreak(1, 10)], // 600s break after round 1
    });
    const map = projectPlayEndByRound(state, now);
    // Round 1 play ends after the current gap (0) + play (420s).
    expect(map.get(1)).toBe(now + 0 + 420_000);
    // Round 2 = +break(600) +play(420) instead of move.
    expect(map.get(2)).toBe(now + 420_000 + 600_000 + 420_000);
  });
});

describe("projectPlayEndByRound — remaining branch fallbacks", () => {
  it("treats a running phase with no phaseStartedAt as zero elapsed", () => {
    const now = 1_000_000;
    const state = makeState({
      phase: "play",
      isRunning: true,
      phaseStartedAt: null, // `?? now` => elapsed 0 => full play remains
      totalRounds: 1,
    });
    const map = projectPlayEndByRound(state, now);
    expect(map.get(1)).toBe(now + 420_000);
  });

  it("running break with no breakDurationMs falls back to remainingMs", () => {
    const now = 1_000_000;
    const state = makeState({
      phase: "break",
      isRunning: true,
      phaseStartedAt: now, // elapsed 0
      breakDurationMs: null,
      remainingMs: 90_000,
      round: 2,
      totalRounds: 2,
    });
    const map = projectPlayEndByRound(state, now);
    expect(map.get(2)).toBe(now + 90_000 + 420_000);
  });

  it("running break with neither breakDurationMs nor remainingMs falls back to 0", () => {
    const now = 1_000_000;
    const state = makeState({
      phase: "break",
      isRunning: true,
      phaseStartedAt: now,
      breakDurationMs: null,
      remainingMs: null,
      round: 2,
      totalRounds: 2,
    });
    const map = projectPlayEndByRound(state, now);
    expect(map.get(2)).toBe(now + 0 + 420_000);
  });
});

describe("validateBreaks / validateStateBreaks — fallback branches", () => {
  it("treats a missing breaks array as no breaks", () => {
    const state = makeState({ breaks: undefined });
    expect(validateBreaks(state, () => 0)).toEqual([]);
  });

  it("validateStateBreaks falls back to now when the round is not in the projection", () => {
    const now = 1_000_000;
    // A resume-time break after a round beyond totalRounds is never projected,
    // so projected.get(afterRound) is undefined and `?? now` is used. With
    // resumeAt in the future, now < resumeAt => no overrun => no problem.
    const state = makeState({
      totalRounds: 2,
      breaks: [resumeBreak(99, now + 60_000)],
    });
    expect(validateStateBreaks(state, now)).toEqual([]);
  });
});
