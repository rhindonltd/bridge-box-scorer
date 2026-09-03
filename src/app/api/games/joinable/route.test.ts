import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/game-index/queries", () => ({ findJoinableGames: vi.fn() }));

import { findJoinableGames } from "@/db/game-index/queries";
import * as appHandler from "./route";

describe("GET /api/games/joinable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns joinable games in a success envelope", async () => {
    vi.mocked(findJoinableGames).mockResolvedValue([{ gameId: "g1" }] as never);

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
