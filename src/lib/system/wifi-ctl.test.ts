import { describe, it, expect, vi, beforeEach } from "vitest";

const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));
vi.mock("child_process", async (importActual) => {
  const actual = await importActual<typeof import("child_process")>();
  return { ...actual, execFile, default: { ...actual, execFile } };
});

import { execFile as mockExecFile } from "child_process";
import { runWifiCtl, WifiCtlBusyError, WifiCtlError } from "@/lib/system/wifi-ctl";

type ExecCallback = (e: unknown, r?: { stdout: string; stderr: string }) => void;

function resolveWith(stdout: string) {
  vi.mocked(mockExecFile).mockImplementation(((
    _cmd: string,
    _args: string[],
    cb: unknown,
  ) => {
    (cb as ExecCallback)(null, { stdout, stderr: "" });
  }) as never);
}

function rejectWith(err: object) {
  vi.mocked(mockExecFile).mockImplementation(((
    _cmd: string,
    _args: string[],
    cb: unknown,
  ) => {
    (cb as (e: unknown) => void)(err);
  }) as never);
}

describe("runWifiCtl", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invokes sudo -n wifi-ctl.sh with the verb and args, returning stdout", async () => {
    resolveWith("raw-output\n");

    const out = await runWifiCtl("scan");
    expect(out).toBe("raw-output\n");

    const call = vi.mocked(mockExecFile).mock.calls[0] as unknown as [
      string,
      string[],
    ];
    expect(call[0]).toBe("sudo");
    expect(call[1]).toEqual([
      "-n",
      "/usr/local/bridgebox/bin/wifi-ctl.sh",
      "scan",
    ]);
  });

  it("passes extra args through (e.g. test-connect ssid password)", async () => {
    resolveWith("TEST_RESULT: ok (connected + internet)\n");

    await runWifiCtl("test-connect", ["HomeNet", "secret"]);

    const args = (vi.mocked(mockExecFile).mock.calls[0] as unknown as [
      string,
      string[],
    ])[1];
    expect(args).toEqual([
      "-n",
      "/usr/local/bridgebox/bin/wifi-ctl.sh",
      "test-connect",
      "HomeNet",
      "secret",
    ]);
  });

  it("throws WifiCtlBusyError when the helper reports the lock is held", async () => {
    rejectWith({
      code: 1,
      stderr: "another network operation is in progress",
    });

    await expect(runWifiCtl("scan")).rejects.toBeInstanceOf(WifiCtlBusyError);
  });

  it("detects the busy marker on stdout too", async () => {
    rejectWith({
      code: 1,
      stdout: "another network operation is in progress",
      stderr: "",
    });

    await expect(runWifiCtl("scan")).rejects.toBeInstanceOf(WifiCtlBusyError);
  });

  it("throws WifiCtlError with stderr for other non-zero exits", async () => {
    rejectWith({ code: 3, stderr: "boom" });

    const err = (await runWifiCtl("scan").catch((e) => e)) as WifiCtlError;
    expect(err).toBeInstanceOf(WifiCtlError);
    expect(err.stderr).toBe("boom");
    expect(err.code).toBe(3);
    expect(err.message).toContain("wifi-ctl scan failed");
  });
});
