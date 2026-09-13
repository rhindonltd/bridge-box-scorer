import { describe, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";

// Silence structured error logging on the 500 path.
vi.mock("@/lib/log", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { withBasicRoute, type BasicRouteContext } from "./basicRoute";

function makeReq(): any {
  return { url: "http://localhost/api/thing" };
}

describe("withBasicRoute", () => {
  it("passes the request to the handler and returns its response", async () => {
    const handler = vi.fn(async (_context: BasicRouteContext) =>
      NextResponse.json({ ok: true }),
    );
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

  it("returns 500 when an async handler rejects", async () => {
    // The wrapper awaits the handler, so a rejected promise is caught too.
    const route = withBasicRoute(async () => {
      throw new Error("async boom");
    });

    const res = await route(makeReq());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Internal server error",
    });
  });

  it("awaits and forwards dynamic route params to the handler", async () => {
    const handler = vi.fn(
      async (_context: BasicRouteContext<{ id: string }>) =>
        NextResponse.json({ ok: true }),
    );
    const route = withBasicRoute(handler);

    await route(makeReq(), { params: Promise.resolve({ id: "42" }) });

    expect(handler.mock.calls[0][0].params).toEqual({ id: "42" });
  });

  it("passes undefined params for static routes (no second arg)", async () => {
    const handler = vi.fn(async (_context: BasicRouteContext) =>
      NextResponse.json({ ok: true }),
    );
    const route = withBasicRoute(handler);

    await route(makeReq());

    expect(handler.mock.calls[0][0].params).toBeUndefined();
  });
});
