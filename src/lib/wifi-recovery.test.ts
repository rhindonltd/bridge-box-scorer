import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitForApReachable } from "@/lib/wifi-recovery";

describe("waitForApReachable", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("resolves once the network endpoint responds ok", async () => {
    // Offline for the first poll, then reachable.
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true } as Response);

    const promise = waitForApReachable({ intervalMs: 1000, timeoutMs: 10000 });

    // Flush the first (rejected) attempt and its interval wait.
    await vi.advanceTimersByTimeAsync(1000);
    // Second attempt resolves ok.
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBeUndefined();
  });

  it("rejects when the box never comes back before the timeout", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));

    const promise = waitForApReachable({ intervalMs: 1000, timeoutMs: 3000 });
    const assertion = expect(promise).rejects.toThrow(/come back/);

    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });
});
