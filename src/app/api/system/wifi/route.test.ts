import { describe, it, expect, vi, beforeEach } from "vitest";

const { writeFileSync } = vi.hoisted(() => ({ writeFileSync: vi.fn() }));
vi.mock("fs", async (importActual) => {
  const actual = await importActual<typeof import("fs")>();
  return { ...actual, writeFileSync, default: { ...actual, writeFileSync } };
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

  it("writes the wifi config for an authorised admin", async () => {
    const res = await POST(req({ ssid: "HomeNet", password: "secret" }));
    expect(res.status).toBe(200);
    expect(writeFileSync).toHaveBeenCalledOnce();
    const written = JSON.parse(writeFileSync.mock.calls[0][1] as string);
    expect(written).toEqual({ ssid: "HomeNet", password: "secret" });
  });

  it("returns 400 for an invalid body", async () => {
    const res = await POST(req({ ssid: "HomeNet" }));
    expect(res.status).toBe(400);
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid token", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);
    const res = await POST(req({ ssid: "x", password: "y" }, null));
    expect(res.status).toBe(401);
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("returns success:false (200) and writes nothing when WiFi is unavailable", async () => {
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(false);
    const res = await POST(req({ ssid: "HomeNet", password: "secret" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "WiFi management not available on this device",
    });
    expect(writeFileSync).not.toHaveBeenCalled();
  });
});
