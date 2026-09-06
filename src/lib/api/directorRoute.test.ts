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

type DirectorHandlerContext = GameRouteContext & { body: Record<string, unknown> };

const fakeDb = { marker: "db" } as never;

function makeReq(
  body: unknown,
  { badJson = false, headerToken = null }: { badJson?: boolean; headerToken?: string | null } = {},
): any {
  return {
    headers: { get: (name: string) => (name === "x-director-token" ? headerToken : null) },
    json: badJson
      ? vi.fn(async () => {
          throw new Error("bad json");
        })
      : vi.fn(async () => body),
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

  it("invokes the handler with the parsed body when the token is valid", async () => {
    const handler = vi.fn(async (_context: DirectorHandlerContext) =>
      NextResponse.json({ ok: true }),
    );

    const res = await withDirectorRoute(handler)(
      makeReq({ directorToken: "tok", extra: 1 }),
      ctx({ gameId: "g1" }),
    );

    expect(validateDirectorToken).toHaveBeenCalledWith("tok", "g1");
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].body).toMatchObject({
      directorToken: "tok",
      extra: 1,
    });
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("accepts the token from the x-director-token header (no body needed)", async () => {
    const handler = vi.fn(async (_context: DirectorHandlerContext) =>
      NextResponse.json({ ok: true }),
    );
    const req = makeReq(undefined, { badJson: true, headerToken: "tok" });

    const res = await withDirectorRoute(handler)(req, ctx({ gameId: "g1" }));

    // Header path is used; the body is never parsed.
    expect(req.json).not.toHaveBeenCalled();
    expect(validateDirectorToken).toHaveBeenCalledWith("tok", "g1");
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].body).toEqual({});
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("returns 401 when the header token is invalid for the game", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const handler = vi.fn();

    const res = await withDirectorRoute(handler)(
      makeReq(undefined, { badJson: true, headerToken: "wrong" }),
      ctx({ gameId: "g1" }),
    );

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no token and the body is unparseable", async () => {
    // No token is extracted, so validation is called with undefined -> false.
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await withDirectorRoute(async () => NextResponse.json({}))(
      makeReq(null, { badJson: true }),
      ctx({ gameId: "g1" }),
    );

    // No credentials presented (header absent, body unparseable) -> 401.
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    });
  });

  it("returns 401 when the director token is missing from the body", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await withDirectorRoute(async () => NextResponse.json({}))(
      makeReq({ notAToken: true }),
      ctx({ gameId: "g1" }),
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    });
  });

  it("returns 401 when the director token is not valid for the game", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const handler = vi.fn();

    const res = await withDirectorRoute(handler)(
      makeReq({ directorToken: "wrong" }),
      ctx({ gameId: "g1" }),
    );

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    });
  });

  it("returns 404 (from the underlying game route) when the game is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);

    const res = await withDirectorRoute(async () => NextResponse.json({}))(
      makeReq({ directorToken: "tok" }),
      ctx({ gameId: "ghost" }),
    );

    expect(res.status).toBe(404);
  });
});
