/**
 * Client-side director token store.
 *
 * Tokens are stored in localStorage keyed by gameId so a director can manage
 * multiple games simultaneously without losing access.
 *
 * Storage key format: `director:<gameId>`
 */

import { createKeyedTokenStore, verifyToken } from "@/lib/token-store";

const store = createKeyedTokenStore<string>(
  "director:",
  (token) => token,
  (raw) => raw,
);

/**
 * Fired on `window` whenever this device gains or loses a director token, so
 * the director-alert listener can re-join the right rooms straight away.
 */
export const DIRECTOR_TOKENS_CHANGED = "bridgebox:director-tokens-changed";

function announceChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DIRECTOR_TOKENS_CHANGED));
  }
}

export function setDirectorToken(gameId: string, token: string): void {
  store.set(gameId, token);
  announceChange();
}

export function getDirectorToken(gameId: string): string | null {
  return store.get(gameId);
}

export function clearDirectorToken(gameId: string): void {
  store.clear(gameId);
  announceChange();
}

/** Every game this device holds a director token for. */
export function heldDirectorTokens(): {
  gameId: string;
  directorToken: string;
}[] {
  return store
    .entries()
    .map(([gameId, directorToken]) => ({ gameId, directorToken }));
}

export function isDirectorFor(gameId: string): boolean {
  return store.has(gameId);
}

/**
 * Verify the stored director token for a game against the server.
 *
 * The presence of a `director:<gameId>` token in localStorage is NOT proof of
 * authorization — a stale, expired, or bogus value would otherwise let someone
 * into the manage screens. This asks the server whether the token is a live
 * DIRECTOR session for this game; on a definite "no" (HTTP 401) the stale token
 * is cleared so the user is redirected out. A transient network error leaves
 * the (possibly-valid) token in place.
 */
export async function verifyDirectorTokenWithServer(
  gameId: string,
): Promise<boolean> {
  return verifyToken({
    token: getDirectorToken(gameId),
    url: `/api/games/${gameId}/director/validate`,
    headerName: "x-director-token",
    onInvalid: () => clearDirectorToken(gameId),
  });
}
