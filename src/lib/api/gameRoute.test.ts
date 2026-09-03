import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/db/games";
import { withGameRoute, type GameRouteContext } from "./gameRoute";

const fakeDb = { marker: "db" } as never;

function ctx(params: Record<string, string | undefined>) {
  return { params: Promise.resolve(params) } as never;
}

describe("withGameRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(fakeDb);
  });

  it("loads the db and forwards a parsed context to the handler", async () => {
    let received: GameRouteContext | null = null;
    const route = withGameRoute(async (c) => {
      received = c;
      return NextResponse.json({ ok: true });
    });

    const res = await route({} as never, ctx({ gameId: "g1", boardNumber: "3", seat: "A1NS" }));

    expect(getDb).toHaveBeenCalledWith("g1");
    expect(received!).toMatchObject({
      gameId: "g1",
      boardNumber: 3,
      seat: "A1NS",
      db: fakeDb,
    });
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("defaults boardNumber and seat to null when absent", async () => {
    let received: GameRouteContext | null = null;
    await withGameRoute(async (c) => {
      received = c;
      return NextResponse.json({ ok: true });
    })({} as never, ctx({ gameId: "g1" }));

    expect(received!.boardNumber).toBeNull();
    expect(received!.seat).toBeNull();
  });

  it("returns 400 for an invalid board number", async () => {
    const handler = vi.fn();
    const res = await withGameRoute(handler)(
      {} as never,
      ctx({ gameId: "g1", boardNumber: "not-a-number" }),
    );

    expect(res.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Invalid board number",
    });
  });

  it("returns 404 when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const handler = vi.fn();

    const res = await withGameRoute(handler)({} as never, ctx({ gameId: "ghost" }));

    expect(res.status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Game not found",
    });
  });

  it("returns 500 when resolving params/db throws", async () => {
    vi.mocked(getDb).mockRejectedValue(new Error("db error"));

    const res = await withGameRoute(async () => NextResponse.json({ ok: true }))(
      {} as never,
      ctx({ gameId: "g1" }),
    );

    expect(res.status).toBe(500);
  });
});
