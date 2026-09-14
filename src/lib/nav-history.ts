/**
 * Session-scoped in-app navigation tracker.
 *
 * The App Router does not expose whether there is an in-app entry to go back
 * to, and `window.history.length` is unreliable (it counts forward entries and
 * never really drops to zero). To decide whether `router.back()` is safe — i.e.
 * whether it would return to another screen *within this app* rather than
 * leaving it — we track how many client-side navigations the app itself has
 * performed this session.
 *
 * `recordAppNavigation()` is called once per in-app navigation (wired up by
 * {@link useTrackAppNavigation}), and `hasInAppHistory()` reports whether at
 * least one such navigation has happened. When it has, the browser's back stack
 * contains an entry we own and `router.back()` is safe; when it has not, the
 * current screen was the app's entry point (opened directly, reloaded, or a
 * root landing screen) and callers should fall back to a known route instead.
 *
 * This is deliberately module-level (per document/session). It does NOT touch
 * or intercept the browser history stack, so the hardware/browser back button
 * is entirely unaffected.
 */

let appNavigationCount = 0;

/** Record that the app performed an in-app (client-side) navigation. */
export function recordAppNavigation(): void {
  appNavigationCount += 1;
}

/**
 * Whether the app has navigated in-app at least once this session, meaning the
 * back stack holds an entry we can safely return to via `router.back()`.
 */
export function hasInAppHistory(): boolean {
  return appNavigationCount > 0;
}

/** Test-only: reset the tracker between cases. */
export function resetAppNavigation(): void {
  appNavigationCount = 0;
}
