import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/admin-key", () => ({ validateAdminToken: vi.fn() }));

const { isWifiManagementAvailable } = vi.hoisted(() => ({
  isWifiManagementAvailable: vi.fn(),
}));
vi.mock("@/lib/system/wifi-availability", () => ({ isWifiManagementAvailable }));

const { getOwnAp } = vi.hoisted(() => ({ getOwnAp: vi.fn() }));
vi.mock("@/lib/system/wifi-ap", () => ({ getOwnAp }));

const { runWifiCtl } = vi.hoisted(() => ({ runWifiCtl: vi.fn() }));
// Keep the real error classes so `instanceof` checks in the route work.
vi.mock("@/lib/system/wifi-ctl", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/system/wifi-ctl")>();
  return { ...actual, runWifiCtl };
});

const { writeScanResult } = vi.hoisted(() => ({ writeScanResult: vi.fn() }));
vi.mock("@/lib/system/wifi-config", () => ({ writeScanResult }));

import { validateAdminToken } from "@/db/system/queries/admin-key";
import { WifiCtlBusyError } from "@/lib/system/wifi-ctl";
import { POST } from "./route";

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
  });

  it("delegates the scan to wifi-ctl and parses its raw output, excluding the own AP", async () => {
    vi.mocked(runWifiCtl).mockResolvedValue(
      ["BridgeBox:WPA2:99", "HomeNet:WPA2:80", "Cafe:--:55"].join("\n"),
    );

    const res = await POST(req());
    const body = await res.json();

    expect(runWifiCtl).toHaveBeenCalledWith("scan");
    expect(body.success).toBe(true);
    const ssids = body.result.networks.map((n: { ssid: string }) => n.ssid);
    expect(ssids).toEqual(["HomeNet", "Cafe"]); // own AP filtered out
  });

  it("persists in-progress before the scan, then the final networks", async () => {
    vi.mocked(runWifiCtl).mockResolvedValue("HomeNet:WPA2:80");

    await POST(req());

    const writes = vi.mocked(writeScanResult).mock.calls.map((c) => c[0]);
    expect(writes[0]).toMatchObject({ inProgress: true, networks: [] });
    expect(writes.at(-1)).toMatchObject({
      inProgress: false,
      networks: [{ ssid: "HomeNet", signal: 80 }],
    });
  });

  it("reports a retriable busy result when a provisioning window holds the lock", async () => {
    vi.mocked(runWifiCtl).mockRejectedValue(new WifiCtlBusyError());

    const res = await POST(req());
    const body = await res.json();

    expect(body.success).toBe(false);
    expect(body.busy).toBe(true);
    expect(vi.mocked(writeScanResult).mock.calls.at(-1)?.[0]).toMatchObject({
      inProgress: false,
      failed: true,
    });
  });

  it("persists the failure reason when the helper errors", async () => {
    vi.mocked(runWifiCtl).mockRejectedValue(new Error("wifi-ctl scan failed"));

    const res = await POST(req());
    const body = await res.json();

    expect(body.success).toBe(false);
    expect(body.error).toContain("wifi-ctl scan failed");
    expect(vi.mocked(writeScanResult).mock.calls.at(-1)?.[0]).toMatchObject({
      inProgress: false,
      failed: true,
    });
  });

  it("returns 401 without a valid admin token and never scans", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);

    const res = await POST(req(null));
    expect(res.status).toBe(401);
    expect(runWifiCtl).not.toHaveBeenCalled();
  });

  it("reports available:false without scanning when WiFi management is absent", async () => {
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(false);

    const res = await POST(req());
    const body = await res.json();

    expect(body.success).toBe(false);
    expect(runWifiCtl).not.toHaveBeenCalled();
  });
});
