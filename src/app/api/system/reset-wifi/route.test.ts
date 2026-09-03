import { describe, it, expect, vi, beforeEach } from "vitest";

const { exec, existsSync, unlinkSync } = vi.hoisted(() => ({
  exec: vi.fn(),
  existsSync: vi.fn(),
  unlinkSync: vi.fn(),
}));
vi.mock("child_process", async (importActual) => {
  const actual = await importActual<typeof import("child_process")>();
  return { ...actual, exec, default: { ...actual, exec } };
});
vi.mock("fs", async (importActual) => {
  const actual = await importActual<typeof import("fs")>();
  return { ...actual, existsSync, unlinkSync, default: { ...actual, existsSync, unlinkSync } };
});
vi.mock("@/db/system/queries/admin-key", () => ({ validateAdminToken: vi.fn() }));

import { validateAdminToken } from "@/db/system/queries/admin-key";
import { POST } from "./route";

function req(token: string | null) {
  const headers = new Headers();
  if (token) headers.set("x-admin-token", token);
  return new Request("http://localhost/api/system/reset-wifi", {
    method: "POST",
    headers,
  }) as never;
}

describe("POST /api/system/reset-wifi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAdminToken).mockResolvedValue(true);
  });

  it("removes the wifi config and restarts the service", async () => {
    existsSync.mockReturnValue(true);

    const res = await POST(req("tok"));
    expect(res.status).toBe(200);
    expect(unlinkSync).toHaveBeenCalled();
    expect(exec).toHaveBeenCalledWith("sudo systemctl restart bridge-box");
  });

  it("skips deletion when no config file exists but still restarts", async () => {
    existsSync.mockReturnValue(false);

    const res = await POST(req("tok"));
    expect(res.status).toBe(200);
    expect(unlinkSync).not.toHaveBeenCalled();
    expect(exec).toHaveBeenCalled();
  });

  it("returns 401 and touches nothing for an invalid token", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);
    const res = await POST(req(null));
    expect(res.status).toBe(401);
    expect(unlinkSync).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });
});
