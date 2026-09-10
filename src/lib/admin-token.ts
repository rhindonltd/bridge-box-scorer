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

// Fired whenever the admin token changes in this tab so that
// useSyncExternalStore subscribers (e.g. the settings layout gate) re-read.
const ADMIN_TOKEN_EVENT = "admin-token-change";

function notifyAdminTokenChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_TOKEN_EVENT));
  }
}

export function setAdminToken(token: string): void {
  localStorage.setItem(KEY, token);
  notifyAdminTokenChange();
}

export function getAdminToken(): string | null {
  return localStorage.getItem(KEY);
}

export function clearAdminToken(): void {
  localStorage.removeItem(KEY);
  notifyAdminTokenChange();
}

export function hasAdminToken(): boolean {
  return getAdminToken() !== null;
}

/**
 * Verify the stored admin token against the server.
 *
 * The presence of a token in localStorage is NOT proof of authorization — a
 * stale, expired, or bogus value would otherwise bypass the admin gate. This
 * asks the server whether the token maps to a live ADMIN session. On a definite
 * "no" (HTTP 401) the stale token is cleared so the user is re-prompted.
 *
 * Returns true only when the server confirms the token. Network/other errors
 * return false without clearing the token (it may be a transient failure rather
 * than an invalid token).
 */
export async function verifyAdminTokenWithServer(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;

  try {
    const res = await fetch("/api/system/admin-key/validate", {
      headers: { "x-admin-token": token },
      cache: "no-store",
    });

    if (res.status === 401) {
      // Definitively not authorized — drop the stale token.
      clearAdminToken();
      return false;
    }

    return res.ok;
  } catch {
    // Transient failure; don't clear a possibly-valid token.
    return false;
  }
}

/**
 * Subscribe to admin-token changes. Listens both to same-tab changes (via a
 * custom event dispatched by the setters above) and cross-tab changes (via the
 * browser `storage` event). Intended for use with `useSyncExternalStore`.
 */
export function subscribeAdminToken(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(ADMIN_TOKEN_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ADMIN_TOKEN_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
