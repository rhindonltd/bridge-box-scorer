/**
 * Surface an operation failure to the user. Currently a native `alert` with the
 * error's message (falling back to a generic one for non-Error throws) — the
 * consistent director-facing error path used across the setup flows.
 *
 * Centralised here so every call site reports the same way and a future switch
 * to an in-app toast/banner is a single-file change rather than a sweep.
 */
export function reportError(err: unknown): void {
  alert(err instanceof Error ? err.message : "Something went wrong");
}
