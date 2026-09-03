import { describe, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";

import { withBasicRoute } from "./basicRoute";

function makeReq(): any {
  return { url: "http://localhost/api/thing" };
}

describe("withBasicRoute", () => {
  it("passes the request to the handler and returns its response", async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const route = withBasicRoute(handler);

    const res = await route(makeReq());

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].req).toBeDefined();
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("returns 500 when the handler throws synchronously", async () => {
    // The wrapper's try/catch guards the synchronous call to the handler.
    const route = withBasicRoute((() => {
      throw new Error("boom");
    }) as never);

    const res = await route(makeReq());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Internal server error",
    });
  });
});
