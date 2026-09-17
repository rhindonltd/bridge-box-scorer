import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/admin-key", () => ({
  validateAdminToken: vi.fn(),
}));
vi.mock("@/db/system/actions/delete-login-session", () => ({
  deleteLoginSession: vi.fn(),
}));

import { validateAdminToken } from "@/db/system/queries/admin-key";
import { deleteLoginSession } from "@/db/system/actions/delete-login-session";
import { POST } from "./route";

const req = (token: string | null) => {
  const headers = new Headers();
  if (token) headers.set("x-admin-token", token);
  return new Request("http://localhost/api/system/admin-key/logout", {
    method: "POST",
    headers,
  }) as never;
};

describe("POST /api/system/admin-key/logout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates the session and returns success for a valid token", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(true);

    const res = await POST(req("good"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      result: { loggedOut: true },
    });
    expect(deleteLoginSession).toHaveBeenCalledWith("good");
  });

  it("returns 401 and does not delete anything for a stale / invalid token", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);

    const res = await POST(req("stale"));

    expect(res.status).toBe(401);
    expect(deleteLoginSession).not.toHaveBeenCalled();
  });

  it("returns 401 when no token is provided", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);

    const res = await POST(req(null));

    expect(res.status).toBe(401);
    expect(deleteLoginSession).not.toHaveBeenCalled();
  });
});
