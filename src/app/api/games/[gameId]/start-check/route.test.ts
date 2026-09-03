import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/services/start-game-service", () => ({ checkStart: vi.fn() }));

import { getDb } from "@/db/games";
import { checkStart } from "@/services/start-game-service";
import * as appHandler from "./route";

describe("GET /api/games/[gameId]/start-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
  });

  it("returns the start-check result", async () => {
    vi.mocked(checkStart).mockResolvedValue({ canStart: true } as never);

    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(checkStart).toHaveBeenCalledWith("g1", { marker: "db" });
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { canStart: true },
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
