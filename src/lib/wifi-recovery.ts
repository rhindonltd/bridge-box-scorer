/**
 * Poll `/api/system/network` until the appliance is reachable again.
 *
 * Both the WiFi connection test and a WiFi save briefly take the hosted hotspot
 * down on a single-radio appliance, which disconnects the very client that
 * triggered the action. Once the hotspot returns and the browser reconnects,
 * this resolves so the caller can proceed (e.g. read the persisted test
 * result or reload the app).
 *
 * Resolves once a request to the network endpoint succeeds, or rejects if it
 * has not come back within `timeoutMs`.
 */
export async function waitForApReachable({
  intervalMs = 3000,
  timeoutMs = 120000,
  signal,
}: {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
} = {}): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error("aborted");

    try {
      const res = await fetch("/api/system/network", {
        cache: "no-store",
        signal,
      });
      if (res.ok) return;
    } catch {
      // Still offline (AP down / client not reconnected yet).
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for the Bridge Box WiFi to come back");
}
