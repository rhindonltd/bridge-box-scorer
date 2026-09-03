import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/game-index/queries/find-all-games", () => ({
  findAllGames: vi.fn(),
}));

import { findAllGames } from "@/db/game-index/queries/find-all-games";
import * as appHandler from "./route";

describe("GET /api/games/all", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all games wrapped in a success envelope", async () => {
    vi.mocked(findAllGames).mockResolvedValue([
      { gameId: "g1" },
      { gameId: "g2" },
    ] as never);

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { games: [{ gameId: "g1" }, { gameId: "g2" }] },
        });
      },
    });
  });
});
