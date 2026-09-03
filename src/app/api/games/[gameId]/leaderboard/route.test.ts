import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/services/leaderboard-service", () => ({
  computeLeaderboard: vi.fn(),
  computeSectionLeaderboards: vi.fn(),
}));

import { getDb } from "@/db/games";
import {
  computeLeaderboard,
  computeSectionLeaderboards,
} from "@/services/leaderboard-service";
import * as appHandler from "./route";

describe("GET /api/games/[gameId]/leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
  });

  it("returns combined leaderboard and per-section leaderboards", async () => {
    vi.mocked(computeLeaderboard).mockResolvedValue({ lines: [] } as never);
    vi.mocked(computeSectionLeaderboards).mockResolvedValue([
      { section: "A" },
    ] as never);

    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { leaderboard: { lines: [] }, sections: [{ section: "A" }] },
        });
      },
    });
  });
});
