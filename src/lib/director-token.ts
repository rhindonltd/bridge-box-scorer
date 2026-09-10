/**
 * Client-side director token store.
 *
 * Tokens are stored in localStorage keyed by gameId so a director can manage
 * multiple games simultaneously without losing access.
 *
 * Storage key format: `director:<gameId>`
 */

const PREFIX = "director:";

export function setDirectorToken(gameId: string, token: string): void {
  localStorage.setItem(`${PREFIX}${gameId}`, token);
}

export function getDirectorToken(gameId: string): string | null {
  return localStorage.getItem(`${PREFIX}${gameId}`);
}

export function clearDirectorToken(gameId: string): void {
  localStorage.removeItem(`${PREFIX}${gameId}`);
}

export function isDirectorFor(gameId: string): boolean {
  return getDirectorToken(gameId) !== null;
}

/**
 * Verify the stored director token for a game against the server.
 *
 * The presence of a `director:<gameId>` token in localStorage is NOT proof of
 * authorization — a stale, expired, or bogus value would otherwise let someone
 * into the manage screens. This asks the server whether the token is a live
 * DIRECTOR session for this game. On a definite "no" (HTTP 401) the stale token
 * is cleared so the user is redirected out.
 *
 * Returns true only when the server confirms the token. Network/other errors
 * return false without clearing the token (it may be a transient failure rather
 * than an invalid token).
 */
export async function verifyDirectorTokenWithServer(
  gameId: string,
): Promise<boolean> {
  const token = getDirectorToken(gameId);
  if (!token) return false;

  try {
    const res = await fetch(`/api/games/${gameId}/director/validate`, {
      headers: { "x-director-token": token },
      cache: "no-store",
    });

    if (res.status === 401) {
      // Definitively not authorized — drop the stale token.
      clearDirectorToken(gameId);
      return false;
    }

    return res.ok;
  } catch {
    // Transient failure; don't clear a possibly-valid token.
    return false;
  }
}
