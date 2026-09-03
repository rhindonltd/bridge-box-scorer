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

function makeReq(body: unknown, { badJson = false } = {}): any {
  return {
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

  it("returns 400 for an unparseable JSON body", async () => {
    const res = await withDirectorRoute(async () => NextResponse.json({}))(
      makeReq(null, { badJson: true }),
      ctx({ gameId: "g1" }),
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Invalid JSON body",
    });
  });

  it("returns 400 when the director token is missing from the body", async () => {
    const res = await withDirectorRoute(async () => NextResponse.json({}))(
      makeReq({ notAToken: true }),
      ctx({ gameId: "g1" }),
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Missing or invalid director token",
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
