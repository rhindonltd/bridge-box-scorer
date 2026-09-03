import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/services/movement-service", () => ({
  getMovementWithProgress: vi.fn(),
}));

import { getDb } from "@/db/games";
import { getMovementWithProgress } from "@/services/movement-service";
import * as appHandler from "./route";

describe("GET /api/games/[gameId]/movement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
  });

  it("returns the movement-with-progress result", async () => {
    vi.mocked(getMovementWithProgress).mockResolvedValue([
      { tableNumber: 1 },
    ] as never);

    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { movement: [{ tableNumber: 1 }] },
        });
      },
    });
  });
});
