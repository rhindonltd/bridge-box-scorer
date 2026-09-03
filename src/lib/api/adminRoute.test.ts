import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/db/system/queries/admin-key", () => ({
  validateAdminToken: vi.fn(),
}));

import { validateAdminToken } from "@/db/system/queries/admin-key";
import { withAdminRoute } from "./adminRoute";

function makeReq(token: string | null): any {
  return {
    headers: { get: (h: string) => (h === "x-admin-token" ? token : null) },
  };
}

describe("withAdminRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes the handler when the admin token is valid", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(true);
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));

    const res = await withAdminRoute(handler)(makeReq("good-token"));

    expect(validateAdminToken).toHaveBeenCalledWith("good-token");
    expect(handler).toHaveBeenCalledOnce();
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("returns 401 when the admin token is invalid", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);
    const handler = vi.fn();

    const res = await withAdminRoute(handler)(makeReq("bad"));

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    });
  });

  it("returns 500 when validation throws", async () => {
    vi.mocked(validateAdminToken).mockRejectedValue(new Error("db down"));

    const res = await withAdminRoute(async () =>
      NextResponse.json({ ok: true }),
    )(makeReq("x"));

    expect(res.status).toBe(500);
  });
});
