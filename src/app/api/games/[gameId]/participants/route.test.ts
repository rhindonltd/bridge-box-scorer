import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

import * as appHandler from "@/app/api/games/[gameId]/participants/route";

vi.mock("@/db/games/pairs/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

import { findPairs } from "@/db/games/queries/find-pairs";

describe("GET /api/games/pairs/[gameId]/participants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns pairs for the game", async () => {
    const mockPairs = [
      {
        type: "PAIR",
        initialSeat: "1NS",
        player1: {
          id: 1,
          firstName: "Alice",
          lastName: "Smith",
          nationalId: "123",
        },
        player2: {
          id: 2,
          firstName: "Bob",
          lastName: "Jones",
          nationalId: "456",
        },
      },
    ];

    vi.mocked(findPairs).mockResolvedValue(mockPairs as any);

    await testApiHandler({
      appHandler,
      rejectOnHandlerError: true,
      params: { gameId: "game-123" },
      test: async ({ fetch }) => {
        const response = await fetch({ method: "GET" });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(mockPairs);
        expect(findPairs).toHaveBeenCalledWith("game-123");
      },
    });
  });

  it("returns 500 when findPairs throws", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    vi.mocked(findPairs).mockRejectedValue(new Error("DB error"));

    await testApiHandler({
      appHandler,
      params: { gameId: "game-123" },
      test: async ({ fetch }) => {
        const response = await fetch({ method: "GET" });
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
          success: false,
          error: "Internal server error",
        });
        expect(findPairs).toHaveBeenCalledWith("game-123");
        expect(consoleErrorSpy).toHaveBeenCalled();
      },
    });

    consoleErrorSpy.mockRestore();
  });
});
