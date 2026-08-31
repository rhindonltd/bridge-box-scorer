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
