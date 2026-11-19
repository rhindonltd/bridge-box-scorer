/**
 * Where a screen is about to navigate after an action that also changes the
 * game's state (finalise, reopen).
 *
 * The server broadcasts the changed game (GAME_UPDATED) before the HTTP reply
 * arrives, so a state guard on the current page can react first and redirect
 * somewhere else, beating the screen's own navigation. Recording the intended
 * destination before the request lets the guards send the user there instead.
 * Client-only, and cleared once used.
 */
let intent: string | null = null;

/** Record where this screen will go once its current action succeeds. */
export function setNavIntent(path: string): void {
  intent = path;
}

/** Forget a recorded destination (e.g. the action failed). */
export function clearNavIntent(): void {
  intent = null;
}

/** Take the recorded destination, if any, clearing it. */
export function takeNavIntent(): string | null {
  const path = intent;
  intent = null;
  return path;
}
