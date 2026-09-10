import { describe, it, expect, vi, beforeEach } from "vitest";

// execFile is consumed via promisify(execFile); drive the node-style callback.
const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));
vi.mock("child_process", async (importActual) => {
  const actual = await importActual<typeof import("child_process")>();
  return { ...actual, execFile, default: { ...actual, execFile } };
});

vi.mock("@/db/system/queries/admin-key", () => ({ validateAdminToken: vi.fn() }));

const { isWifiManagementAvailable } = vi.hoisted(() => ({
  isWifiManagementAvailable: vi.fn(),
}));
vi.mock("@/lib/system/wifi-availability", () => ({ isWifiManagementAvailable }));

const { getOwnAp, bringConnectionDown, bringConnectionUp } = vi.hoisted(() => ({
  getOwnAp: vi.fn(),
  bringConnectionDown: vi.fn(),
  bringConnectionUp: vi.fn(),
}));
vi.mock("@/lib/system/wifi-ap", () => ({
  getOwnAp,
  bringConnectionDown,
  bringConnectionUp,
}));

const { writeScanResult } = vi.hoisted(() => ({ writeScanResult: vi.fn() }));
vi.mock("@/lib/system/wifi-config", () => ({ writeScanResult }));

import { execFile as mockExecFile } from "child_process";
import { validateAdminToken } from "@/db/system/queries/admin-key";
import { POST } from "./route";

type ExecCallback = (e: unknown, r?: { stdout: string; stderr: string }) => void;

/** Resolve the scan (execFile) with the given stdout. */
function mockScanStdout(stdout: string) {
  vi.mocked(mockExecFile).mockImplementation(((
    _cmd: string,
    _args: string[],
    cb: unknown,
  ) => {
    (cb as ExecCallback)(null, { stdout, stderr: "" });
  }) as never);
}

const req = (token: string | null = "tok") => {
  const headers = new Headers();
  if (token) headers.set("x-admin-token", token);
  return new Request("http://localhost/api/system/wifi/scan", {
    method: "POST",
    headers,
  }) as never;
};

describe("POST /api/system/wifi/scan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAdminToken).mockResolvedValue(true);
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(true);
    vi.mocked(getOwnAp).mockResolvedValue({
      connectionName: "BridgeBox-AP",
      ssid: "BridgeBox",
    });
    vi.mocked(bringConnectionDown).mockResolvedValue(undefined);
    vi.mocked(bringConnectionUp).mockResolvedValue(undefined);
  });

  it("brings the AP down, scans, brings it back up, and excludes the own AP", async () => {
    mockScanStdout(
      ["BridgeBox:WPA2:99", "HomeNet:WPA2:80", "Cafe:--:55"].join("\n"),
    );

    const res = await POST(req());
    const body = await res.json();

    expect(body.success).toBe(true);
    const ssids = body.result.networks.map((n: { ssid: string }) => n.ssid);
    expect(ssids).toEqual(["HomeNet", "Cafe"]); // own AP filtered out

    // Disruptive sequence: AP down before the scan, AP up after.
    expect(bringConnectionDown).toHaveBeenCalledWith("BridgeBox-AP");
    expect(bringConnectionUp).toHaveBeenCalledWith("BridgeBox-AP");
  });

  it("persists in-progress before the AP drops, then the final networks", async () => {
    mockScanStdout("HomeNet:WPA2:80");

    await POST(req());

    const writes = vi.mocked(writeScanResult).mock.calls.map((c) => c[0]);
    expect(writes[0]).toMatchObject({ inProgress: true, networks: [] });
    expect(writes.at(-1)).toMatchObject({
      inProgress: false,
      networks: [{ ssid: "HomeNet", signal: 80 }],
    });
    // The in-progress write happens before the AP is brought down.
    const downOrder = vi.mocked(bringConnectionDown).mock.invocationCallOrder[0];
    const firstWriteOrder =
      vi.mocked(writeScanResult).mock.invocationCallOrder[0];
    expect(firstWriteOrder).toBeLessThan(downOrder);
  });

  it("restores the AP and persists the real failure reason when the scan errors", async () => {
    // Simulate nmcli exiting non-zero with a permission-style stderr.
    vi.mocked(mockExecFile).mockImplementation(((
      _cmd: string,
      _args: string[],
      cb: unknown,
    ) => {
      const err = Object.assign(new Error("Command failed"), {
        stderr: "Error: Not authorized to control networking.",
        code: 4,
      });
      (cb as (e: unknown) => void)(err);
    }) as never);

    const res = await POST(req());
    const body = await res.json();

    expect(body.success).toBe(false);
    // The real nmcli reason is surfaced in the response and the persisted result.
    expect(body.error).toContain("Not authorized to control networking");
    // AP is still brought back up even though the scan failed.
    expect(bringConnectionUp).toHaveBeenCalledWith("BridgeBox-AP");
    const persisted = vi.mocked(writeScanResult).mock.calls.at(-1)?.[0];
    expect(persisted).toMatchObject({ inProgress: false, failed: true });
    expect(persisted?.error).toContain("Not authorized to control networking");
  });

  it("scans without down/up when no AP is hosted (e.g. wired uplink)", async () => {
    vi.mocked(getOwnAp).mockResolvedValue(null);
    mockScanStdout("HomeNet:WPA2:80");

    const res = await POST(req());
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(bringConnectionDown).not.toHaveBeenCalled();
    expect(bringConnectionUp).not.toHaveBeenCalled();
    expect(body.result.networks.map((n: { ssid: string }) => n.ssid)).toEqual([
      "HomeNet",
    ]);
  });

  it("returns 401 without a valid admin token and never touches the radio", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);

    const res = await POST(req(null));
    expect(res.status).toBe(401);
    expect(bringConnectionDown).not.toHaveBeenCalled();
    expect(mockExecFile).not.toHaveBeenCalled();
  });

  it("reports available:false without scanning when WiFi management is absent", async () => {
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(false);

    const res = await POST(req());
    const body = await res.json();

    expect(body.success).toBe(false);
    expect(bringConnectionDown).not.toHaveBeenCalled();
    expect(mockExecFile).not.toHaveBeenCalled();
  });
});
