import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/admin-key", () => ({ validateAdminToken: vi.fn() }));

const { isWifiManagementAvailable } = vi.hoisted(() => ({
  isWifiManagementAvailable: vi.fn(),
}));
vi.mock("@/lib/system/wifi-availability", () => ({ isWifiManagementAvailable }));

const { runNmcli } = vi.hoisted(() => ({ runNmcli: vi.fn() }));
vi.mock("@/lib/system/nmcli", () => ({ runNmcli }));

const { getOwnAp } = vi.hoisted(() => ({ getOwnAp: vi.fn() }));
vi.mock("@/lib/system/wifi-ap", () => ({ getOwnAp }));

import { validateAdminToken } from "@/db/system/queries/admin-key";
import { GET } from "./route";

const req = (token: string | null = "tok") => {
  const headers = new Headers();
  if (token) headers.set("x-admin-token", token);
  return new Request("http://localhost/api/system/wifi/diagnostics", {
    method: "GET",
    headers,
  }) as never;
};

describe("GET /api/system/wifi/diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAdminToken).mockResolvedValue(true);
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(true);
    vi.mocked(getOwnAp).mockResolvedValue({
      connectionName: "BridgeBox-AP",
      ssid: "BridgeBox",
    });
  });

  it("returns parsed permissions, active connections, and detected AP", async () => {
    vi.mocked(runNmcli).mockImplementation(async (args: string[]) => {
      if (args.includes("permissions")) {
        return [
          "org.freedesktop.NetworkManager.network-control:yes",
          "org.freedesktop.NetworkManager.enable-disable-wifi:auth",
        ].join("\n");
      }
      // active connections
      return "BridgeBox-AP:802-11-wireless\nWired:802-3-ethernet";
    });

    const res = await GET(req());
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.result.wifiManagementAvailable).toBe(true);
    expect(body.result.permissions).toContainEqual({
      key: "org.freedesktop.NetworkManager.network-control",
      value: "yes",
    });
    expect(body.result.ownAp).toEqual({
      connectionName: "BridgeBox-AP",
      ssid: "BridgeBox",
    });
    expect(body.result.activeConnections).toContain("BridgeBox-AP");
  });

  it("captures a permissions lookup error instead of throwing", async () => {
    vi.mocked(runNmcli).mockRejectedValue(new Error("nmcli boom"));
    vi.mocked(getOwnAp).mockResolvedValue(null);

    const res = await GET(req());
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.result.permissions).toBeNull();
    expect(body.result.permissionsError).toContain("nmcli boom");
    expect(body.result.ownAp).toBeNull();
  });

  it("reports wifiManagementAvailable:false without probing when nmcli is absent", async () => {
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(false);

    const res = await GET(req());
    const body = await res.json();

    expect(body.result.wifiManagementAvailable).toBe(false);
    expect(body.result.permissions).toBeNull();
    expect(runNmcli).not.toHaveBeenCalled();
  });

  it("returns 401 without a valid admin token", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);

    const res = await GET(req(null));
    expect(res.status).toBe(401);
    expect(runNmcli).not.toHaveBeenCalled();
  });
});
