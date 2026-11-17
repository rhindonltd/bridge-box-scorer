import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/game-index/queries/find-finalised-games", () => ({
  findFinalisedGames: vi.fn(),
}));

import { findFinalisedGames } from "@/db/game-index/queries/find-finalised-games";
import * as appHandler from "./route";

describe("GET /api/games/finalised", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the finalised games wrapped in a success envelope", async () => {
    vi.mocked(findFinalisedGames).mockResolvedValue([
      { gameId: "g1" },
    ] as never);

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { games: [{ gameId: "g1" }] },
        });
      },
    });
  });
});
