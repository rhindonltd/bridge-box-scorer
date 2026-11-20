import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/game-index/queries/find-all-games", () => ({
  findNotStartedGames: vi.fn(),
}));

import { findNotStartedGames } from "@/db/game-index/queries/find-all-games";
import * as appHandler from "./route";

describe("GET /api/games/not-started", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the games not started yet in a success envelope", async () => {
    vi.mocked(findNotStartedGames).mockResolvedValue([
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
