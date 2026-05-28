import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import { Direction } from '@/model/common'

import * as appHandler from "./route";

vi.mock(
    "@/db/games/shared/queries/find-player-initial-seats",
    () => ({
        findPlayerInitialSeats: vi.fn(),
    })
);

import { findPlayerInitialSeats } from "@/db/games/shared/queries/find-player-initial-seats";

describe("GET /api/games/[gameId]/player-initial-seats", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns player initial seats for the game", async () => {
        const mockSeats = [
            {
                tableNumber: 1,
                direction: 'N' as Direction,
                player: {
                    firstName: 'xxx',
                    lastName: 'yyy',
                    nationalId: '123'
                }
            },
            {
                tableNumber: 2,
                direction: 'N' as Direction,
                player: {
                    firstName: 'xxx',
                    lastName: 'yyy',
                    nationalId: '123'
                }
            },
        ];

        vi.mocked(findPlayerInitialSeats).mockResolvedValue(
            mockSeats
        );

        await testApiHandler({
            appHandler,

            params: {
                gameId: "game-123",
            },

            rejectOnHandlerError: true,

            test: async ({ fetch }) => {
                const response = await fetch({
                    method: "GET",
                });

                expect(response.status).toBe(200);

                expect(await response.json()).toEqual(mockSeats);

                expect(findPlayerInitialSeats).toHaveBeenCalledWith(
                    "game-123"
                );
            },
        });
    });

    it("returns 500 when findPlayerInitialSeats throws", async () => {
        const consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        vi.mocked(findPlayerInitialSeats).mockRejectedValue(
            new Error("Database error")
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

                expect(consoleErrorSpy).toHaveBeenCalled();

                expect(findPlayerInitialSeats).toHaveBeenCalledWith(
                    "game-123"
                );
            },
        });

        consoleErrorSpy.mockRestore();
    });
});
