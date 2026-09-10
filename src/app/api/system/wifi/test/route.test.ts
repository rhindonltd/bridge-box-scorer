import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/admin-key", () => ({ validateAdminToken: vi.fn() }));

const { isWifiManagementAvailable } = vi.hoisted(() => ({
  isWifiManagementAvailable: vi.fn(),
}));
vi.mock("@/lib/system/wifi-availability", () => ({ isWifiManagementAvailable }));

const { runWifiCtl } = vi.hoisted(() => ({ runWifiCtl: vi.fn() }));
vi.mock("@/lib/system/wifi-ctl", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/system/wifi-ctl")>();
  return { ...actual, runWifiCtl };
});

const { writeTestResult } = vi.hoisted(() => ({ writeTestResult: vi.fn() }));
vi.mock("@/lib/system/wifi-config", () => ({ writeTestResult }));

import { validateAdminToken } from "@/db/system/queries/admin-key";
import { WifiCtlBusyError } from "@/lib/system/wifi-ctl";
import { runWifiCtl as mockRunWifiCtl } from "@/lib/system/wifi-ctl";
import { POST } from "./route";

function req(body: unknown, token: string | null = "tok") {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("x-admin-token", token);
  return new Request("http://localhost/api/system/wifi/test", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }) as never;
}

describe("POST /api/system/wifi/test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAdminToken).mockResolvedValue(true);
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(true);
  });

  it("passes ssid/password to wifi-ctl test-connect and reports success on ok", async () => {
    vi.mocked(mockRunWifiCtl).mockResolvedValue(
      "TEST_RESULT: ok (connected + internet)\n",
    );

    const res = await POST(req({ ssid: "HomeNet", password: "secret" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      result: { connected: true, internet: true },
    });
    expect(mockRunWifiCtl).toHaveBeenCalledWith("test-connect", [
      "HomeNet",
      "secret",
    ]);
  });

  it("passes the hidden flag through as the third arg", async () => {
    vi.mocked(mockRunWifiCtl).mockResolvedValue("TEST_RESULT: ok (x)");

    await POST(req({ ssid: "Hidden", password: "pw", hidden: true }));

    expect(mockRunWifiCtl).toHaveBeenCalledWith("test-connect", [
      "Hidden",
      "pw",
      "yes",
    ]);
  });

  it("treats connected-no-internet as connected (Save allowed) but internet:false", async () => {
    vi.mocked(mockRunWifiCtl).mockResolvedValue(
      "TEST_RESULT: connected-no-internet (associated but no route out)",
    );

    const res = await POST(req({ ssid: "HomeNet", password: "secret" }));
    await expect(res.json()).resolves.toEqual({
      success: true,
      result: { connected: true, internet: false },
    });
    expect(vi.mocked(writeTestResult).mock.calls.at(-1)?.[0]).toMatchObject({
      connected: true,
      internet: false,
      inProgress: false,
    });
  });

  it("reports failure when the helper says failed", async () => {
    vi.mocked(mockRunWifiCtl).mockResolvedValue(
      "TEST_RESULT: failed (could not connect — check password/SSID)",
    );

    const res = await POST(req({ ssid: "HomeNet", password: "wrong" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Failed to connect to the network",
    });
    expect(vi.mocked(writeTestResult).mock.calls.at(-1)?.[0]).toMatchObject({
      connected: false,
      inProgress: false,
    });
  });

  it("persists in-progress before the test, then the final result", async () => {
    vi.mocked(mockRunWifiCtl).mockResolvedValue("TEST_RESULT: ok (x)");

    await POST(req({ ssid: "HomeNet", password: "secret" }));

    const writes = vi.mocked(writeTestResult).mock.calls.map((c) => c[0]);
    expect(writes[0]).toMatchObject({ inProgress: true, connected: false });
    expect(writes.at(-1)).toMatchObject({ inProgress: false, connected: true });
  });

  it("reports a retriable busy result when a provisioning window holds the lock", async () => {
    vi.mocked(mockRunWifiCtl).mockRejectedValue(new WifiCtlBusyError());

    const res = await POST(req({ ssid: "HomeNet", password: "secret" }));
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.busy).toBe(true);
  });

  it("returns 400 for an invalid body", async () => {
    const res = await POST(req({ password: "x" }));
    expect(res.status).toBe(400);
    expect(mockRunWifiCtl).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid token and never calls the helper", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);
    const res = await POST(req({ ssid: "x", password: "y" }, null));
    expect(res.status).toBe(401);
    expect(mockRunWifiCtl).not.toHaveBeenCalled();
  });

  it("returns success:false (200) when WiFi management is unavailable", async () => {
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(false);
    const res = await POST(req({ ssid: "x", password: "y" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "WiFi management not available on this device",
    });
    expect(mockRunWifiCtl).not.toHaveBeenCalled();
  });
});
