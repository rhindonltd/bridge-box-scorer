/**
 * Client-side admin session token store.
 *
 * Unlike director tokens (which are keyed by gameId), the admin token is
 * device-global, so a single localStorage key is used. The token is issued by
 * the admin-key verify endpoint after a correct key is entered; the raw admin
 * key is never stored client-side.
 *
 * Storage key: `admin-token`
 */

const KEY = "admin-token";

export function setAdminToken(token: string): void {
  localStorage.setItem(KEY, token);
}

export function getAdminToken(): string | null {
  return localStorage.getItem(KEY);
}

export function clearAdminToken(): void {
  localStorage.removeItem(KEY);
}

export function hasAdminToken(): boolean {
  return getAdminToken() !== null;
}
