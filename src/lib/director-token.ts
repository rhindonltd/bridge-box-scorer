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
