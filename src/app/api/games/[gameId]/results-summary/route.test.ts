import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/db/games/queries/get-results-summary", () => ({
  getResultsSummary: vi.fn(),
}));

import { getDb } from "@/db/games";
import { getResultsSummary } from "@/db/games/queries/get-results-summary";
import * as appHandler from "./route";

describe("GET /api/games/[gameId]/results-summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
  });

  it("returns the results summary in a success envelope", async () => {
    vi.mocked(getResultsSummary).mockResolvedValue({
      totalPlayable: 4,
      finalized: 4,
      allResultsIn: true,
    });

    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { totalPlayable: 4, finalized: 4, allResultsIn: true },
        });
      },
    });
  });

  it("returns 404 when the game is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);

    await testApiHandler({
      appHandler,
      params: { gameId: "ghost" },
      test: async ({ fetch }) => {
        expect((await fetch({ method: "GET" })).status).toBe(404);
      },
    });
  });
});
