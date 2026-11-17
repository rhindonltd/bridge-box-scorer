import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/services/finalise-game-service", () => ({
  checkFinalise: vi.fn(),
}));

import { getDb } from "@/db/games";
import { checkFinalise } from "@/services/finalise-game-service";
import * as appHandler from "./route";

describe("GET /api/games/[gameId]/finalise-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
  });

  it("returns the check result in a success envelope", async () => {
    vi.mocked(checkFinalise).mockResolvedValue({
      canFinalise: false,
      problems: [{ code: "RESULTS_OUTSTANDING", message: "2 of 6 left" }],
    });

    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: {
            canFinalise: false,
            problems: [{ code: "RESULTS_OUTSTANDING", message: "2 of 6 left" }],
          },
        });
      },
    });
    expect(checkFinalise).toHaveBeenCalledWith("g1", {});
  });
});
