import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

import * as appHandler from "./route";

vi.mock("@/db/games/individual/queries/find-individuals", () => ({
  findIndividuals: vi.fn(),
}));

import { findIndividuals } from "@/db/games/individual/queries/find-individuals";

describe("GET /api/games/individual/[gameId]/participants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns individuals for the game", async () => {
    const mockIndividuals = [
      {
        type: "INDIVIDUAL",
        initialSeat: "1N",
        player: {
          id: 1,
          firstName: "Alice",
          lastName: "Smith",
          nationalId: "123",
        },
      },
      {
        type: "INDIVIDUAL",
        initialSeat: "1S",
        player: {
          id: 2,
          firstName: "Bob",
          lastName: "Jones",
          nationalId: "456",
        },
      },
    ];

    vi.mocked(findIndividuals).mockResolvedValue(mockIndividuals as any);

    await testApiHandler({
      appHandler,
      params: { gameId: "game-123" },
      rejectOnHandlerError: true,
      test: async ({ fetch }) => {
        const response = await fetch({ method: "GET" });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(mockIndividuals);
        expect(findIndividuals).toHaveBeenCalledWith("game-123");
      },
    });
  });

  it("returns 500 when findIndividuals throws", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    vi.mocked(findIndividuals).mockRejectedValue(new Error("Database error"));

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
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(findIndividuals).toHaveBeenCalledWith("game-123");
      },
    });

    consoleErrorSpy.mockRestore();
  });
});
