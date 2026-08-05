import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

import * as appHandler from "./route";

vi.mock("@/db/game-index/queries", () => ({
  findJoinableGames: vi.fn(),
}));

import { findJoinableGames } from "@/db/game-index/queries";
import { GameType } from "@/db/game/types/game-type";
import { GameStatus } from "@/db/game/types/game-status";

describe("GET /api/games/joinable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns joinable games", async () => {
    const mockGames = [
      {
        id: 1,
        eventName: "Game One",
        director: "xxx",
        gameType: "PAIRS" as GameType,
        scoringType: "MP" as const,
        gameId: "xx",
        sessionName: "",
        sectionName: "",
        eventDate: new Date().toISOString(),
        tables: 5,
        leadCardRequired: true,
        status: "JOINABLE" as GameStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 1,
        eventName: "Game Two",
        director: "yyy",
        gameType: "PAIRS" as GameType,
        scoringType: "MP" as const,
        gameId: "xx",
        sessionName: "",
        sectionName: "",
        eventDate: new Date().toISOString(),
        tables: 6,
        leadCardRequired: true,
        status: "JOINABLE" as GameStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    vi.mocked(findJoinableGames).mockResolvedValue(mockGames);

    await testApiHandler({
      appHandler,
      rejectOnHandlerError: true,

      test: async ({ fetch }) => {
        const response = await fetch({
          method: "GET",
        });

        expect(response.status).toBe(200);

        expect(await response.json()).toEqual(mockGames);

        expect(findJoinableGames).toHaveBeenCalledTimes(1);
      },
    });
  });

  it("returns 500 when findJoinableGames throws", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    vi.mocked(findJoinableGames).mockRejectedValue(new Error("DB failure"));

    await testApiHandler({
      appHandler,

      test: async ({ fetch }) => {
        const response = await fetch({
          method: "GET",
        });

        expect(response.status).toBe(500);

        expect(await response.json()).toEqual({
          success: false,
          error: "Internal server error",
        });

        expect(findJoinableGames).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalled();
      },
    });

    consoleErrorSpy.mockRestore();
  });
});
