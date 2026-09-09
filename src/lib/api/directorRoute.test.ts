import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { withDirectorRoute } from "./directorRoute";
import type { GameRouteContext } from "@/lib/api/gameRoute";

const fakeDb = { marker: "db" } as never;

/** A request whose only credential source is the `x-director-token` header. */
function makeReq(headerToken: string | null = null): any {
  return {
    headers: {
      get: (name: string) =>
        name === "x-director-token" ? headerToken : null,
    },
    // A body must never be read now; fail loudly if a handler tries.
    json: vi.fn(async () => {
      throw new Error("body should not be parsed");
    }),
  };
}

function ctx(params: Record<string, string | undefined>) {
  return { params: Promise.resolve(params) } as never;
}

describe("withDirectorRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(fakeDb);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("authorises using the x-director-token header and never reads the body", async () => {
    const handler = vi.fn(async (_context: GameRouteContext) =>
      NextResponse.json({ ok: true }),
    );
    const req = makeReq("tok");

    const res = await withDirectorRoute(handler)(req, ctx({ gameId: "g1" }));

    expect(validateDirectorToken).toHaveBeenCalledWith("tok", "g1");
    expect(req.json).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledOnce();
    // The context is the plain game-route context (no `body` field added).
    expect(handler.mock.calls[0][0]).not.toHaveProperty("body");
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("returns 401 when the header token is missing", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const handler = vi.fn();

    const res = await withDirectorRoute(handler)(
      makeReq(null),
      ctx({ gameId: "g1" }),
    );

    expect(validateDirectorToken).toHaveBeenCalledWith(null, "g1");
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    });
  });

  it("returns 401 when the header token is invalid for the game", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const handler = vi.fn();

    const res = await withDirectorRoute(handler)(
      makeReq("wrong"),
      ctx({ gameId: "g1" }),
    );

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 404 (from the underlying game route) when the game is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);

    const res = await withDirectorRoute(async () => NextResponse.json({}))(
      makeReq("tok"),
      ctx({ gameId: "ghost" }),
    );

    expect(res.status).toBe(404);
  });
});
