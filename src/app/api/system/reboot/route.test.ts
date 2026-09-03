import { describe, it, expect, vi, beforeEach } from "vitest";

const { exec } = vi.hoisted(() => ({ exec: vi.fn() }));
vi.mock("child_process", async (importActual) => {
  const actual = await importActual<typeof import("child_process")>();
  return { ...actual, exec, default: { ...actual, exec } };
});
vi.mock("@/db/system/queries/admin-key", () => ({ validateAdminToken: vi.fn() }));

import { validateAdminToken } from "@/db/system/queries/admin-key";
import { POST } from "./route";

// System side-effecting routes are invoked directly (not through NTARH) so the
// child_process mock is guaranteed to apply — this keeps the real reboot/wifi
// scripts from ever running during tests.
function req(token: string | null) {
  const headers = new Headers();
  if (token) headers.set("x-admin-token", token);
  return new Request("http://localhost/api/system/reboot", {
    method: "POST",
    headers,
  }) as never;
}

describe("POST /api/system/reboot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAdminToken).mockResolvedValue(true);
  });

  it("runs the reboot script for an authorised admin", async () => {
    const res = await POST(req("tok"));
    expect(res.status).toBe(200);
    expect(exec).toHaveBeenCalledWith("sudo /usr/local/bridgebox/bin/reboot.sh");
    await expect(res.json()).resolves.toEqual({
      success: true,
      result: { message: "Rebooting device..." },
    });
  });

  it("returns 401 and does not run the script for an invalid token", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);
    const res = await POST(req(null));
    expect(res.status).toBe(401);
    expect(exec).not.toHaveBeenCalled();
  });
});
