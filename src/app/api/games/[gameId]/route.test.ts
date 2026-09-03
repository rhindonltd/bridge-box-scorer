import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));

import { getDb } from "@/db/games";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import * as appHandler from "./route";

describe("GET /api/games/[gameId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
  });

  it("returns the game for a valid gameId", async () => {
    vi.mocked(findGameById).mockResolvedValue({ gameId: "g1" } as never);

    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { game: { gameId: "g1" } },
        });
      },
    });
  });

  it("returns 404 when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(null);

    await testApiHandler({
      appHandler,
      params: { gameId: "ghost" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(404);
        await expect(res.json()).resolves.toMatchObject({ success: false });
      },
    });
  });
});
