import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

const del = vi.fn(() => ({ where: vi.fn() }));

// The route deletes the game row from the game-index database (getDb from
// @/db/game-index, called synchronously), then removes the per-game .db file.
// `withGameRoute` (under withDirectorRoute) still resolves a per-game db via
// @/db/games#getDb, so that must be mocked truthy for the route to proceed.
vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/db/game-index", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/game-index/schema", () => ({ games: { gameId: "game_id" } }));
vi.mock("fs", () => ({
  default: { existsSync: vi.fn(() => false), unlinkSync: vi.fn() },
}));

import fs from "fs";
import { getDb as getGamesDb } from "@/db/games";
import { getDb as getIndexDb } from "@/db/game-index";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import * as appHandler from "./route";

const body = JSON.stringify({ directorToken: "tok" });

describe("DELETE /api/games/[gameId]/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // withGameRoute resolves a (truthy) per-game db before the handler runs.
    vi.mocked(getGamesDb).mockResolvedValue({} as never);
    // getIndexDb() is synchronous in the route, so return the db directly.
    vi.mocked(getIndexDb).mockReturnValue({ delete: del } as never);
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

  it("deletes the sqlite file when it exists using DATABASE_GAMES_URL", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.stubEnv("DATABASE_GAMES_URL", "/tmp/games-dir");

    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "DELETE", body });
        expect(res.status).toBe(200);
        expect(fs.existsSync).toHaveBeenCalledWith("/tmp/games-dir/g1.db");
        expect(fs.unlinkSync).toHaveBeenCalledWith("/tmp/games-dir/g1.db");
      },
    });

    vi.unstubAllEnvs();
  });

  it("does not delete the sqlite file when it does not exist (default dir)", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.stubEnv("DATABASE_GAMES_URL", undefined as unknown as string);

    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "DELETE", body });
        expect(res.status).toBe(200);
        expect(fs.existsSync).toHaveBeenCalledWith(
          "/home/bridgebox/data/games/g1.db",
        );
        expect(fs.unlinkSync).not.toHaveBeenCalled();
      },
    });

    vi.unstubAllEnvs();
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
