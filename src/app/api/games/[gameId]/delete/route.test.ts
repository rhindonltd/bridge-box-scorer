import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

const del = vi.fn(() => ({ where: vi.fn() }));

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/game-index/schema", () => ({ games: { gameId: "game_id" } }));
vi.mock("fs", () => ({
  default: { existsSync: vi.fn(() => false), unlinkSync: vi.fn() },
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import * as appHandler from "./route";

const body = JSON.stringify({ directorToken: "tok" });

describe("DELETE /api/games/[gameId]/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ delete: del } as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("deletes the game row for an authorised director", async () => {
    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "DELETE", body });
        expect(res.status).toBe(200);
        expect(del).toHaveBeenCalled();
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: {},
        });
      },
    });
  });

  it("returns 401 when the director token is invalid", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);

    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "DELETE", body });
        expect(res.status).toBe(401);
        expect(del).not.toHaveBeenCalled();
      },
    });
  });
});
