"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import type {
  LeaderboardView,
  SectionLeaderboard,
} from "@/context/LeaderboardContext";

type View = "combined" | string; // "combined" or a section letter

/**
 * MP scoring can be shown as a percentage or as raw matchpoints. On the room
 * display the choice is made on a preceding screen (not an in-screen toggle),
 * so the standings scroll with nothing above them but the pinned column header.
 * The values map directly to the MP overall plugin's view ids. Undefined (and
 * any non-MP game) just uses the plugin's default view.
 */
export type LeaderboardScoringMode = "percentage" | "matchpoints";

/**
 * Minimum time a view (Combined / a section) stays on screen before it may
 * rotate on. The actual switch is deferred until the auto-scroll has returned
 * to the top, so a long list is never cut off mid-scroll.
 */
const MIN_DWELL_MS = 20_000;
/**
 * Auto-scroll speed, in CSS pixels per second. This is the single knob for how
 * fast the standings creep down the screen; it does not depend on list length
 * or dwell, so long and short lists scroll at the same readable pace.
 */
const SCROLL_SPEED_PX_PER_SEC = 40;
/** How long to pause at the top and at the bottom of each scroll pass. */
const SCROLL_PAUSE_MS = 3_000;
/** Above this many places, spread the standings across two columns. */
const TWO_COLUMN_ROW_THRESHOLD = 12;
/** The screen must be at least this wide (px) to use two columns. */
const TWO_COLUMN_MIN_WIDTH = 1024;

export interface DisplayLeaderboardViewProps {
  /** The event name, shown as the display heading. */
  eventName: string;
  /** The combined (all-sections) leaderboard, or null when none yet. */
  leaderboard: LeaderboardView | null;
  /** Per-section leaderboards; more than one enables the section tabs. */
  sections: SectionLeaderboard[];
  /** While true, show a spinner instead of the board. */
  isLoading: boolean;
  /**
   * Minimum time (ms) a view is shown before it may rotate on. The actual
   * switch waits until the auto-scroll has returned to the top, so a view can
   * stay longer than this if its list is still scrolling. Exposed mainly so
   * stories and tests can use a shorter dwell.
   */
  dwellMs?: number;
  /**
   * For an MP pairs game, whether to show percentages or raw matchpoints —
   * chosen on the preceding screen (the container always supplies one, so the
   * display never shows an in-screen toggle). Single-view leaderboards
   * (IMP/XIMP, teams) ignore it.
   */
  scoringMode?: LeaderboardScoringMode;
}

/**
 * Presentational room-display leaderboard. It owns no data — the container
 * ({@link DisplayLeaderboardPage}) sources the snapshot from the leaderboard
 * context. Keeping this props-only makes the loading, empty, single- and
 * multi-section states directly storyable and testable without socket wiring.
 *
 * This is the TV/venue-screen leaderboard, distinct from the end-of-session
 * screen (`GameCompleteView`); the two only share the presentational
 * {@link Leaderboard} table. It is deliberately full-viewport with no header or
 * back button (nobody navigates from a shared screen), matching the timer
 * display: `fixed inset-0` escapes the app's `max-w-2xl` cage so it fills a
 * large venue screen.
 *
 * Being a passive venue screen, it is built to be watched hands-free:
 *  - text is enlarged (via the `.leaderboard-display` scope in globals.css) so
 *    it reads from the back of the room;
 *  - when there are many places on a wide screen the standings wrap into two
 *    columns so more fit without scrolling;
 *  - when multiple sections exist it rotates Combined → Section A → … on a
 *    timer (a manual tab tap jumps and restarts the timer);
 *  - if a view is still too tall to fit, it slowly auto-scrolls to the bottom
 *    and back so the overflow places come into view.
 */
export function DisplayLeaderboardView({
  eventName,
  leaderboard: combined,
  sections,
  isLoading,
  dwellMs = MIN_DWELL_MS,
  scoringMode,
}: DisplayLeaderboardViewProps) {
  const multiSection = sections.length > 1;
  // The director can turn off the combined overall ranking for a multi-section
  // event, in which case there is no combined leaderboard to show — only the
  // per-section views rotate.
  const hasCombined = combined !== null;

  // The ordered set of views to rotate through: the Combined view first (when
  // present), then each section in order. With the combined ranking turned off
  // this is just the sections; a single-section game is just the one combined
  // view. The order is never empty as long as there is any data.
  const viewOrder = useMemo<View[]>(
    () => [
      ...(hasCombined ? (["combined"] as View[]) : []),
      ...(multiSection ? sections.map((s) => s.section) : []),
    ],
    [hasCombined, multiSection, sections],
  );

  // Start on the first available view (Combined when present, otherwise the
  // first section).
  const firstView: View = viewOrder[0] ?? "combined";
  const [selected, setSelected] = useState<View>(firstView);

  // Derive the effective view instead of correcting state in an effect: if the
  // set of views changes underneath us (e.g. a re-score removes a section, or
  // the director turns the combined ranking off) so the stored selection is no
  // longer valid, fall back to the first available view for this render.
  const view: View = viewOrder.includes(selected) ? selected : firstView;

  const advanceView = useCallback(() => {
    setSelected((current) => {
      const idx = viewOrder.indexOf(current);
      // -1 (current no longer valid) advances to viewOrder[0].
      return viewOrder[(idx + 1) % viewOrder.length];
    });
  }, [viewOrder]);

  const selectView = useCallback((next: View) => setSelected(next), []);

  // Resolve the leaderboard for the active view.
  const active: LeaderboardView | null =
    view === "combined"
      ? combined
      : (sections.find((s) => s.section === view) ?? null);

  // A two-winner Mitchell shows two independent rankings (NS and EW) side by
  // side rather than one; each already fills its half of the screen, so the
  // screen-fill column wrap is not applied to them.
  const directional = active?.directional;

  // Heading is the event name, with the section appended when a specific
  // section (not the combined view) is being shown.
  const heading =
    view === "combined" ? eventName : `${eventName} — Section ${view}`;

  // Spread into two columns when there are many places and the screen is wide
  // enough to make each column readable. Only for a single (one-winner / teams)
  // ranking — a two-winner event already uses the width for its NS/EW split.
  const rowCount = active?.participants.length ?? 0;
  const wantTwoColumns = useTwoColumns(rowCount >= TWO_COLUMN_ROW_THRESHOLD);
  const splitColumns = !directional && wantTwoColumns ? 2 : 1;

  // Auto-scroll at a constant speed and, when rotating, only advance to the
  // next view once the scroll has eased back to the top (after at least the
  // minimum dwell). This keeps the scroll pace readable regardless of list
  // length and never cuts a long list off mid-scroll. `onReadyToAdvance` is
  // omitted for a single (non-rotating) view, so it just loops in place.
  //
  // Restart the scroll only when the shown view or its size actually changes —
  // not on every render (the `active` object is a fresh reference each time,
  // which would otherwise reset the scroll continuously).
  const rotating = viewOrder.length > 1;
  const scrollRef = useAutoScroll({
    dwellMs,
    onReadyToAdvance: rotating ? advanceView : undefined,
    deps: [view, rowCount, splitColumns, rotating],
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="leaderboard-display fixed inset-0 flex flex-col overflow-hidden bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-3">
        <h1 className="text-4xl font-bold text-gray-900">{heading}</h1>

        {viewOrder.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {hasCombined && (
              <ViewTab
                label="Combined"
                active={view === "combined"}
                onClick={() => selectView("combined")}
              />
            )}
            {sections.map((s) => (
              <ViewTab
                key={s.section}
                label={`Section ${s.section}`}
                active={view === s.section}
                onClick={() => selectView(s.section)}
              />
            ))}
          </div>
        )}
      </div>

      {/*
        Two-winner direction headings sit in a fixed row ABOVE the scroll
        region so they stay put while the standings scroll. The row mirrors the
        two-column `flex gap-6` layout below so each heading aligns over its
        column.
      */}
      {active && directional && (
        <div className="flex shrink-0 gap-6 px-6">
          <h2 className="min-w-0 flex-1 px-2 text-2xl font-bold text-gray-800">
            North / South
          </h2>
          <h2 className="min-w-0 flex-1 px-2 text-2xl font-bold text-gray-800">
            East / West
          </h2>
        </div>
      )}

      <div
        ref={scrollRef}
        // Focusable so the scrollable standings region is keyboard-accessible
        // (a screen may occasionally be driven by keyboard, and it satisfies the
        // scrollable-region-focusable a11y rule).
        tabIndex={0}
        aria-label={`${heading} standings`}
        className="min-h-0 flex-1 overflow-y-auto focus:outline-none"
      >
        {active && directional ? (
          // Two-winner Mitchell: NS and EW are separate fields, shown as two
          // rankings side by side. The direction headings are the fixed row
          // above; only the tables scroll here.
          <div
            data-testid="leaderboard-standings"
            className="flex h-full min-h-0 gap-6 px-6"
          >
            {[directional.ns, directional.ew].map((ranking, i) => (
              <div key={i} className="min-w-0 flex-1">
                <Leaderboard
                  overallScoreAndParticipant={ranking}
                  scroll={false}
                  selectedViewId={scoringMode}
                  interactive={false}
                />
              </div>
            ))}
          </div>
        ) : active ? (
          <div data-testid="leaderboard-standings" className="h-full">
            <Leaderboard
              overallScoreAndParticipant={active}
              splitColumns={splitColumns}
              // The display owns scrolling via its own auto-scroll container
              // (scrollRef), so the table must not create a second scroll
              // region. This lets the table's sticky column header pin to the
              // outer region while the standings scroll beneath it.
              scroll={false}
              // MP/% is chosen on the preceding screen, so fix the view here
              // and drop the in-screen toggle (nothing scrolls above the
              // header). Ignored by non-MP / single-view leaderboards.
              selectedViewId={scoringMode}
              // The display is a passive screen nobody taps, so team names show
              // as static text rather than tap-to-expand buttons.
              interactive={false}
            />
          </div>
        ) : (
          <div
            data-testid="leaderboard-empty"
            className="flex h-full flex-col items-center justify-center p-6"
          >
            <div className="mb-2 text-3xl font-bold text-gray-900">
              No Results Yet
            </div>
            <div className="text-center text-xl text-gray-500">
              Results will appear here once boards have been played.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * True when the viewport is at least {@link TWO_COLUMN_MIN_WIDTH} wide AND the
 * caller wants two columns (enough rows). Tracks viewport resizes so rotating
 * to a shorter/longer section re-evaluates.
 */
function useTwoColumns(enoughRows: boolean): boolean {
  const [wideEnough, setWideEnough] = useState(false);

  useEffect(() => {
    /* v8 ignore next -- SSR guard: window is always defined under jsdom/browser */
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(min-width: ${TWO_COLUMN_MIN_WIDTH}px)`);
    const update = () => setWideEnough(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return wideEnough && enoughRows;
}

/**
 * Slowly auto-scrolls the returned element to its bottom and back to the top,
 * looping, but only while its content overflows. Re-evaluates (and resets to
 * the top) whenever `deps` change — e.g. when the view rotates or new results
 * arrive. When the content fits, it stays put.
 */
function useAutoScroll({
  dwellMs,
  onReadyToAdvance,
  deps,
}: {
  /** Minimum time to stay on this view before it may advance. */
  dwellMs: number;
  /**
   * Called once the view is ready to rotate on: the minimum dwell has elapsed
   * AND the scroll has eased back to the top, so nothing is cut off. Omit to
   * disable rotation (a single view just loops in place).
   */
  onReadyToAdvance?: () => void;
  /** Restart the animation when any of these change. */
  deps: unknown[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Keep the latest callback without restarting the animation each render.
  const advanceRef = useRef(onReadyToAdvance);
  useEffect(() => {
    advanceRef.current = onReadyToAdvance;
  }, [onReadyToAdvance]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.scrollTop = 0;

    // A small state machine, stepped by elapsed time each frame. Scrolling runs
    // at a constant speed (px/sec) so the pace is independent of list length;
    // the dwell timer only decides *when we're allowed* to leave — the actual
    // advance waits until we're back at the top.
    type Phase = "pauseTop" | "down" | "pauseBottom" | "up";
    let phase: Phase = "pauseTop";
    let phaseStart = performance.now();
    let last = phaseStart;
    let advanced = false;
    let raf = 0;

    const tryAdvance = () => {
      if (!advanced) {
        advanced = true;
        advanceRef.current?.();
      }
    };

    // The dwell is tracked by a timer, independent of the scroll animation, so
    // rotation happens reliably even when the content fits (nothing to animate)
    // and does not depend on animation-frame timing. When the timer fires we
    // advance if we're at the top (or the content fits); otherwise we let the
    // scroll finish its return to the top and advance from there.
    let readyToLeave = false;
    const dwellTimer = setTimeout(() => {
      readyToLeave = true;
      const fits = el.scrollHeight - el.clientHeight <= 0;
      if (fits || el.scrollTop <= 0.5) tryAdvance();
    }, dwellMs);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);

      const dt = now - last;
      last = now;

      const max = el.scrollHeight - el.clientHeight;
      const stepPx = (SCROLL_SPEED_PX_PER_SEC * dt) / 1000;

      // If the content fits there is nothing to scroll: hold at the top and let
      // the dwell timer advance.
      if (max <= 0) {
        el.scrollTop = 0;
        if (readyToLeave) tryAdvance();
        return;
      }

      switch (phase) {
        case "pauseTop":
          el.scrollTop = 0;
          if (now - phaseStart >= SCROLL_PAUSE_MS) {
            phase = "down";
            phaseStart = now;
          }
          break;
        case "down":
          el.scrollTop = Math.min(max, el.scrollTop + stepPx);
          if (el.scrollTop >= max - 0.5) {
            el.scrollTop = max;
            phase = "pauseBottom";
            phaseStart = now;
          }
          break;
        case "pauseBottom":
          el.scrollTop = max;
          if (now - phaseStart >= SCROLL_PAUSE_MS) {
            phase = "up";
            phaseStart = now;
          }
          break;
        case "up":
          el.scrollTop = Math.max(0, el.scrollTop - stepPx);
          if (el.scrollTop <= 0.5) {
            el.scrollTop = 0;
            // Back at the top: if the dwell is up, hand off to rotate; else
            // start another down-and-back pass.
            if (readyToLeave) {
              tryAdvance();
            } else {
              phase = "pauseTop";
              phaseStart = now;
            }
          }
          break;
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(dwellTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

function ViewTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-5 py-2 text-lg font-semibold transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
