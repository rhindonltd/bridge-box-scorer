import { describe, it, expect, vi, beforeEach } from "vitest";

// The route persists via the atomic `writeWifiConfig` helper; mock it so this
// test asserts the route's contract (write on valid+authorised, skip otherwise)
// while the atomic-write mechanics are covered in wifi-config.test.ts.
const { writeWifiConfig } = vi.hoisted(() => ({ writeWifiConfig: vi.fn() }));
vi.mock("@/lib/system/wifi-config", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/system/wifi-config")>();
  return { ...actual, writeWifiConfig };
});
vi.mock("@/db/system/queries/admin-key", () => ({ validateAdminToken: vi.fn() }));

const { isWifiManagementAvailable } = vi.hoisted(() => ({
  isWifiManagementAvailable: vi.fn(),
}));
vi.mock("@/lib/system/wifi-availability", () => ({ isWifiManagementAvailable }));

import { validateAdminToken } from "@/db/system/queries/admin-key";
import { POST } from "./route";

function req(body: unknown, token: string | null = "tok") {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("x-admin-token", token);
  return new Request("http://localhost/api/system/wifi", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }) as never;
}

describe("POST /api/system/wifi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAdminToken).mockResolvedValue(true);
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(true);
  });

  it("persists the wifi config via the atomic helper for an authorised admin", async () => {
    const res = await POST(req({ ssid: "HomeNet", password: "secret" }));
    expect(res.status).toBe(200);
    expect(writeWifiConfig).toHaveBeenCalledOnce();
    expect(writeWifiConfig).toHaveBeenCalledWith({
      ssid: "HomeNet",
      password: "secret",
    });
  });

  it("returns 400 for an invalid body", async () => {
    const res = await POST(req({ ssid: "HomeNet" }));
    expect(res.status).toBe(400);
    expect(writeWifiConfig).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid token", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);
    const res = await POST(req({ ssid: "x", password: "y" }, null));
    expect(res.status).toBe(401);
    expect(writeWifiConfig).not.toHaveBeenCalled();
  });

  it("returns success:false (200) and writes nothing when WiFi is unavailable", async () => {
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(false);
    const res = await POST(req({ ssid: "HomeNet", password: "secret" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "WiFi management not available on this device",
    });
    expect(writeWifiConfig).not.toHaveBeenCalled();
  });
});
