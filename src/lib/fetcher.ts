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
