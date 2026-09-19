import { describe, it, expect, vi, beforeEach } from "vitest";

// The module does `promisify(execFile)`, so we provide a callback-style
// `execFile` that Node's real `promisify` can wrap. Each test sets whether the
// nmcli probe "succeeds" (callback with no error) or "fails" (callback with an
// error), and counts invocations. `child_process` keeps a `default` export so
// the module graph's importers stay happy.
const { probe } = vi.hoisted(() => ({
  probe: { ok: true, calls: 0 },
}));

function execFile(
  _cmd: string,
  _args: string[],
  _opts: unknown,
  cb: (err: Error | null, out?: { stdout: string }) => void,
) {
  probe.calls += 1;
  if (probe.ok) cb(null, { stdout: "/usr/bin/nmcli\n" });
  else cb(new Error("not found"));
}

vi.mock("child_process", () => ({ execFile, default: { execFile } }));

import {
  isWifiManagementAvailable,
  __resetWifiAvailabilityCache,
} from "./wifi-availability";

describe("isWifiManagementAvailable", () => {
  beforeEach(() => {
    __resetWifiAvailabilityCache();
    probe.ok = true;
    probe.calls = 0;
  });

  it("returns true when `command -v nmcli` succeeds", async () => {
    probe.ok = true;
    await expect(isWifiManagementAvailable()).resolves.toBe(true);
  });

  it("returns false when nmcli is not on PATH", async () => {
    probe.ok = false;
    await expect(isWifiManagementAvailable()).resolves.toBe(false);
  });

  it("caches the result for the process lifetime", async () => {
    probe.ok = true;
    await isWifiManagementAvailable();
    await isWifiManagementAvailable();
    // Only probed once despite two calls.
    expect(probe.calls).toBe(1);
  });
});
