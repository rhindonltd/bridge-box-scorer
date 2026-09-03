import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

const orderBy = vi.fn();
const from = vi.fn(() => ({ orderBy }));
const selectDistinct = vi.fn(() => ({ from }));

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/db/games/tables/boards", () => ({
  boards: { boardNumber: "board_number" },
}));

import { getDb } from "@/db/games";
import * as appHandler from "./route";

describe("GET /api/games/[gameId]/boards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderBy.mockResolvedValue([{ boardNumber: 1 }, { boardNumber: 2 }]);
    vi.mocked(getDb).mockResolvedValue({ selectDistinct } as never);
  });

  it("returns the distinct ordered board numbers", async () => {
    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { boards: [1, 2] },
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
