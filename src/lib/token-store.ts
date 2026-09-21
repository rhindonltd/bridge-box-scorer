/**
 * Shared helpers for the client-side token stores (director, player, admin).
 *
 * These stores all keep a token in localStorage and share the same "presence
 * in localStorage is NOT proof of authorization" contract, so the verify logic
 * lives here once rather than being copy-pasted per store.
 */

/**
 * A localStorage-backed token store keyed by a per-item id (e.g. gameId), used
 * so one device can hold tokens for several games at once. `serialize` /
 * `deserialize` let a store keep either a raw string token or a structured
 * value.
 */
export function createKeyedTokenStore<T>(
  prefix: string,
  serialize: (value: T) => string,
  deserialize: (raw: string) => T,
) {
  const storageKey = (id: string) => `${prefix}${id}`;

  return {
    set(id: string, value: T): void {
      localStorage.setItem(storageKey(id), serialize(value));
    },
    get(id: string): T | null {
      const raw = localStorage.getItem(storageKey(id));
      return raw == null ? null : deserialize(raw);
    },
    clear(id: string): void {
      localStorage.removeItem(storageKey(id));
    },
    has(id: string): boolean {
      return localStorage.getItem(storageKey(id)) !== null;
    },
  };
}

/**
 * Verify a stored token against the server.
 *
 * The presence of a token in localStorage is NOT proof of authorization — a
 * stale, expired, or bogus value would otherwise bypass a gate. This asks the
 * server whether the token maps to a live session. On a definite "no" (HTTP
 * 401) `onInvalid` is called so the caller can drop the stale token; on
 * network/other errors it returns false WITHOUT calling `onInvalid` (the token
 * may still be valid — a transient failure shouldn't log the user out).
 */
export async function verifyToken(options: {
  token: string | null;
  url: string;
  headerName: string;
  onInvalid: () => void;
}): Promise<boolean> {
  const { token, url, headerName, onInvalid } = options;
  if (!token) return false;

  try {
    const res = await fetch(url, {
      headers: { [headerName]: token },
      cache: "no-store",
    });

    if (res.status === 401) {
      onInvalid();
      return false;
    }

    return res.ok;
  } catch {
    return false;
  }
}
