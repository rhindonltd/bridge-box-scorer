export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    (error as Error & { status: number }).status = res.status;
    throw error;
  }

  const data = await res.json();

  return data.result;
}

/**
 * Build a {@link fetcher} that unwraps a single named field from the result
 * envelope, e.g. `unwrapFetcher<BridgeGame>("game")` reads `result.game`. Lets
 * SWR callers whose endpoint wraps its payload under one key (`{ game }`,
 * `{ games }`, …) skip the boilerplate inline unwrap fetcher.
 */
export function unwrapFetcher<T>(key: string): (url: string) => Promise<T> {
  return async (url) => {
    const result = await fetcher<Record<string, T>>(url);
    return result[key];
  };
}

/**
 * Variant of {@link fetcher} for endpoints that expose their read via POST
 * (e.g. actions with side effects like a WiFi scan). Unwraps the same
 * `{ result }` success envelope.
 */
export async function postFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { method: "POST" });

  if (!res.ok) {
    const error = new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    (error as Error & { status: number }).status = res.status;
    throw error;
  }

  const data = await res.json();

  return data.result;
}
