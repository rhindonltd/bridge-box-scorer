import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useBreakEditor, type BreakTimeline } from "./useBreakEditor";
import { msToResumeAt } from "./timer-format";

const baseTimeline: BreakTimeline = {
  tick: 0,
  totalRounds: 4,
  effectivePlayDuration: 150,
  moveDuration: 90,
};

describe("useBreakEditor", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("seeds drafts from persisted break configs (both modes)", () => {
    const { result } = renderHook(() => useBreakEditor(baseTimeline));

    const resumeAtMs = new Date("2025-01-01T12:30:00").getTime();
    act(() =>
      result.current.seedBreaks([
        { afterRound: 1, mode: "duration", durationSeconds: 600 },
        { afterRound: 2, mode: "resumeTime", resumeAtMs },
      ]),
    );

    expect(result.current.breaks).toHaveLength(2);
    expect(result.current.breaks[0]).toMatchObject({
      afterRound: 1,
      mode: "duration",
      durationMinutes: 10,
    });
    expect(result.current.breaks[1]).toMatchObject({
      afterRound: 2,
      mode: "resumeTime",
      resumeAt: msToResumeAt(resumeAtMs),
    });
  });

  it("adds and removes breaks", () => {
    const { result } = renderHook(() => useBreakEditor(baseTimeline));

    act(() => result.current.onAddBreak());
    act(() => result.current.onAddBreak());
    expect(result.current.breaks).toHaveLength(2);

    act(() => result.current.onRemoveBreak(0));
    expect(result.current.breaks).toHaveLength(1);
  });

  // earliestResumeAt() (line 76) falls back to `tick` when the requested round
  // isn't in the computed timeline. Placing a break after a round beyond
  // totalRounds means computePlayEndByRound never keys that round, so the
  // earliest bound collapses to `tick`.
  it("falls back to tick for the earliest resume when the round is out of range", () => {
    const now = new Date("2025-01-01T10:00:00").getTime();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    // totalRounds 1 => timeline only keys round 1. An added break defaults to
    // afterRound = min(totalRounds - 1 || 1, ...) = 1, but we then push it to a
    // round with no timeline entry so the `?? tick` fallback runs.
    const { result } = renderHook(() =>
      useBreakEditor({ ...baseTimeline, tick: now, totalRounds: 1 }),
    );

    act(() => result.current.onAddBreak());
    // Move the break to round 5, which totalRounds=1 never places in the map.
    act(() => result.current.onBreakChange(0, "afterRound", 5));
    act(() => result.current.onBreakChange(0, "mode", "resumeTime"));

    // With no timeline entry the earliest legal moment is `tick` itself.
    expect(result.current.breaks[0].resumeAt).toBe(msToResumeAt(now));
  });

  // withComputedLengths() (line 140) falls back to `tick` when a resume-time
  // break references a round the supplied timeline doesn't contain.
  it("uses tick as the prior play-end when the round is absent from the timeline", () => {
    const now = new Date("2025-01-01T10:00:00").getTime();
    const { result } = renderHook(() =>
      useBreakEditor({ ...baseTimeline, tick: now }),
    );

    act(() => result.current.onAddBreak());
    act(() => result.current.onBreakChange(0, "afterRound", 2));
    act(() => result.current.onBreakChange(0, "mode", "resumeTime"));
    act(() =>
      result.current.onBreakChange(0, "resumeAt", msToResumeAt(now + 600_000)),
    );

    // An empty timeline map forces the `?? tick` fallback: prior play-end is
    // `tick`, so the computed length is resume(now+10m) - tick = 10m.
    const annotated = result.current.withComputedLengths(new Map());
    expect(annotated[0].computedLength).toBe("10m");
  });

  it("marks duration breaks with a null computed length", () => {
    const { result } = renderHook(() => useBreakEditor(baseTimeline));

    act(() => result.current.onAddBreak());
    const annotated = result.current.withComputedLengths(new Map());
    expect(annotated[0].computedLength).toBeNull();
  });
});
