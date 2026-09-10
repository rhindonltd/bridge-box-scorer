import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/admin-key", () => ({ validateAdminToken: vi.fn() }));

import { validateAdminToken } from "@/db/system/queries/admin-key";
import { GET } from "./route";

const req = (token: string | null) => {
  const headers = new Headers();
  if (token) headers.set("x-admin-token", token);
  return new Request("http://localhost/api/system/admin-key/validate", {
    method: "GET",
    headers,
  }) as never;
};

describe("GET /api/system/admin-key/validate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success for a valid admin token", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(true);

    const res = await GET(req("good"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      result: { valid: true },
    });
  });

  it("returns 401 for a stale / invalid token", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);

    const res = await GET(req("stale"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when no token is provided", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);

    const res = await GET(req(null));
    expect(res.status).toBe(401);
    expect(validateAdminToken).toHaveBeenCalledWith(null);
  });
});
