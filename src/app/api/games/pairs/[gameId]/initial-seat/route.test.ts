import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

import * as appHandler from "./route";

vi.mock(
    "@/db/games/pairs/queries/find-pair-initial-seats",
    () => ({
        findPairInitialSeats: vi.fn(),
    })
);

import { findPairInitialSeats } from "@/db/games/pairs/queries/find-pair-initial-seats";

describe("GET /api/games/[gameId]/pair-initial-seats", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns pair initial seats for a game", async () => {
        const mockSeats = [
            {
                pairId: "pair-1",
                seat: 1,
            },
            {
                pairId: "pair-2",
                seat: 2,
            },
        ];

        vi.mocked(findPairInitialSeats).mockResolvedValue(mockSeats);

        await testApiHandler({
            appHandler,
            rejectOnHandlerError: true,

            params: {
                gameId: "game-123",
            },

            test: async ({ fetch }) => {
                const response = await fetch({
                    method: "GET",
                });

                expect(response.status).toBe(200);

                expect(await response.json()).toEqual(mockSeats);

                expect(findPairInitialSeats).toHaveBeenCalledWith(
                    "game-123"
                );
            },
        });
    });

    it("returns 500 when query throws", async () => {
        const consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        vi.mocked(findPairInitialSeats).mockRejectedValue(
            new Error("DB error")
        );

        await testApiHandler({
            appHandler,

            params: {
                gameId: "game-123",
            },

            test: async ({ fetch }) => {
                const response = await fetch({
                    method: "GET",
                });

                expect(response.status).toBe(500);

                expect(await response.json()).toEqual({
                    success: false,
                    error: "Internal server error",
                });

                expect(findPairInitialSeats).toHaveBeenCalledWith(
                    "game-123"
                );

                expect(consoleErrorSpy).toHaveBeenCalled();
            },
        });

        consoleErrorSpy.mockRestore();
    });
});
