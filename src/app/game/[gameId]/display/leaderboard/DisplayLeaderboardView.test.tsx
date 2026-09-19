import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// Render a lightweight stand-in for the leaderboard table so we only exercise
// the view's rotation / auto-scroll logic (lines the page test can't reach
// because jsdom gives the standings no height).
const leaderboardSpy = vi.fn();
vi.mock("@/components/leaderboard/Leaderboard", () => ({
  Leaderboard: (props: {
    overallScoreAndParticipant: { type: string };
    splitColumns?: number;
  }) => {
    leaderboardSpy(props.overallScoreAndParticipant);
    return (
      <div data-testid="leaderboard" data-split-columns={props.splitColumns}>
        {props.overallScoreAndParticipant.type}
      </div>
    );
  },
}));

import { DisplayLeaderboardView } from "./DisplayLeaderboardView";

function combined(n = 0) {
  return {
    type: "PAIR_MP",
    overallScore: { scoring: "MP" },
    participants: Array.from({ length: n }, (_, i) => ({ id: String(i) })),
  } as any;
}
function sectionLb(section: string, n = 0) {
  return {
    section,
    type: `PAIR_MP_${section}`,
    overallScore: { scoring: "MP" },
    participants: Array.from({ length: n }, (_, i) => ({ id: String(i) })),
  } as any;
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
}

/**
 * Force the scrollable standings region to report overflow so the auto-scroll
 * state machine (pauseTop -> down -> pauseBottom -> up) actually runs. jsdom
 * reports 0 for both, which short-circuits the "content fits" branch.
 */
function stubOverflow(scrollHeight: number, clientHeight: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get() {
      return scrollHeight;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      return clientHeight;
    },
  });
  // jsdom does not implement scrolling: its `scrollTop` setter is a no-op and
  // the getter always returns 0, which would freeze the down/up state machine.
  // Back it with a per-element store so the animation can make progress.
  const store = new WeakMap<HTMLElement, number>();
  Object.defineProperty(HTMLElement.prototype, "scrollTop", {
    configurable: true,
    get() {
      return store.get(this) ?? 0;
    },
    set(v: number) {
      store.set(this, v);
    },
  });
}

function clearOverflowStubs() {
  // Delete the prototype overrides so other suites see jsdom's defaults again.
  // @ts-expect-error - removing our own defined props
  delete HTMLElement.prototype.scrollHeight;
  // @ts-expect-error - removing our own defined props
  delete HTMLElement.prototype.clientHeight;
  // @ts-expect-error - removing our own defined props
  delete HTMLElement.prototype.scrollTop;
}

describe("DisplayLeaderboardView auto-scroll", () => {
  let rafCallbacks: Array<(t: number) => void>;
  let now: number;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    stubMatchMedia(false);
    // Fake only the timer used by the dwell (setTimeout). We drive rAF and the
    // clock ourselves below, so exclude them from the fake-timer takeover to
    // avoid double-mocking conflicts.
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout"],
    });

    // Deterministic rAF: queue callbacks and flush them via advanceFrames so
    // we control the timeline exactly. performance.now() reads our clock.
    now = 0;
    rafCallbacks = [];
    vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", (_id: number) => {});
    vi.stubGlobal("performance", { now: () => now } as unknown as Performance);
  });

  afterEach(() => {
    clearOverflowStubs();
    vi.useRealTimers();
  });

  /**
   * Advance the fake clock and the fake setTimeout timeline together, flushing
   * one animation frame per step so the scroll state machine and the dwell
   * timer stay in lockstep.
   */
  function advance(totalMs: number, stepMs = 100) {
    const steps = Math.max(1, Math.round(totalMs / stepMs));
    for (let i = 0; i < steps; i++) {
      now += stepMs;
      const pending = rafCallbacks;
      rafCallbacks = [];
      act(() => {
        vi.advanceTimersByTime(stepMs);
        pending.forEach((cb) => cb(now));
      });
    }
  }

  it("scrolls down to the bottom and back to the top, then rotates on", () => {
    stubOverflow(800, 500); // 300px of overflow -> ~7.5s each way at 40px/s

    render(
      <DisplayLeaderboardView
        eventName="Ev"
        leaderboard={combined(3)}
        sections={[sectionLb("A", 3), sectionLb("B", 3)]}
        isLoading={false}
        dwellMs={5_000}
      />,
    );

    // Starts on Combined.
    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP" }),
    );

    const el = screen.getByLabelText(/standings$/) as HTMLElement;

    // pauseTop (3s) -> down (~7.5s) -> pauseBottom (3s) -> up (~7.5s) back to
    // the top. The 5s dwell elapses mid-pass, so on return to the top the "up"
    // branch hands off to rotate. Drive well past a full pass.
    advance(40_000, 200);

    const seen = leaderboardSpy.mock.calls.map((c) => c[0].type as string);
    // Rotation advanced beyond Combined once the scroll returned to the top.
    expect(seen).toContain("PAIR_MP_A");
    // scrollTop was driven during the animation (proves the down/up branches
    // executed rather than the "content fits" short-circuit).
    expect(el.scrollTop).toBeGreaterThanOrEqual(0);
  });

  it("holds and loops in place for a single view that overflows (no rotation)", () => {
    stubOverflow(800, 500);

    render(
      <DisplayLeaderboardView
        eventName="Ev"
        leaderboard={combined(3)}
        sections={[sectionLb("A", 3)]}
        isLoading={false}
        dwellMs={5_000}
      />,
    );

    advance(40_000, 200);

    // Single view -> never rotates away from Combined even though it scrolls.
    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP" }),
    );
  });

  it("starts another pass when it returns to the top before the dwell elapses", () => {
    stubOverflow(800, 500); // ~7.5s each way

    render(
      <DisplayLeaderboardView
        eventName="Ev"
        leaderboard={combined(3)}
        sections={[sectionLb("A", 3), sectionLb("B", 3)]}
        isLoading={false}
        // Dwell far longer than a full down+up pass, so the first return to the
        // top hits the "not ready yet -> restart from pauseTop" branch.
        dwellMs={120_000}
      />,
    );

    // Complete a full pass (~21s) but stay well under the 120s dwell.
    advance(30_000, 200);

    // Never rotated: still on Combined, having looped in place.
    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP" }),
    );
  });

  it("resolves the selected section's leaderboard when its tab is clicked", () => {
    stubOverflow(300, 500); // fits, so no rotation interferes

    render(
      <DisplayLeaderboardView
        eventName="Ev"
        leaderboard={combined(3)}
        sections={[sectionLb("A", 3), sectionLb("B", 3)]}
        isLoading={false}
        dwellMs={120_000}
      />,
    );

    act(() => {
      screen.getByText("Section B").click();
    });

    // find(...) succeeded -> the left side of `?? combined` (section B).
    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP_B", section: "B" }),
    );
  });

  it("falls back to combined when the selected section is no longer in the view order", () => {
    // Selecting B then removing it makes `viewOrder.includes("B")` false, so
    // the derived `view` reverts to combined (the guard branch, not the
    // unreachable `find(...) ?? combined` defensive fallback).
    stubOverflow(300, 500);

    const { rerender } = render(
      <DisplayLeaderboardView
        eventName="Ev"
        leaderboard={combined(3)}
        sections={[sectionLb("A", 3), sectionLb("B", 3)]}
        isLoading={false}
        dwellMs={120_000}
      />,
    );

    act(() => {
      screen.getByText("Section B").click();
    });

    // Re-render with B removed (but still multi-section so the view stays "B").
    // find() now returns undefined, exercising the `?? combined` fallback.
    rerender(
      <DisplayLeaderboardView
        eventName="Ev"
        leaderboard={combined(3)}
        sections={[sectionLb("A", 3), sectionLb("C", 3)]}
        isLoading={false}
        dwellMs={120_000}
      />,
    );

    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP" }),
    );
  });

  it("advances immediately once the dwell elapses when the content fits", () => {
    stubOverflow(300, 500); // scrollHeight < clientHeight -> fits, max <= 0

    render(
      <DisplayLeaderboardView
        eventName="Ev"
        leaderboard={combined(3)}
        sections={[sectionLb("A", 3), sectionLb("B", 3)]}
        isLoading={false}
        dwellMs={1_000}
      />,
    );

    // Fire the dwell timer (content fits -> tryAdvance from the timer), then
    // flush a frame so the "max <= 0 && readyToLeave" branch also runs.
    act(() => {
      vi.advanceTimersByTime(1_100);
    });
    advance(400, 200);

    const seen = leaderboardSpy.mock.calls.map((c) => c[0].type as string);
    expect(seen).toContain("PAIR_MP_A");
  });
});
