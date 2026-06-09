import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----
vi.mock("@/db/movements/queries/get-movement", () => ({
    getIndividualMovement: vi.fn(),
    getPairMovement: vi.fn(),
    getTeamMovement: vi.fn(),
}));

vi.mock("@/db/games/pairs/actions/create-movement", () => ({
    createPairMovement: vi.fn(),
}));

vi.mock("@/db/games/individual/actions/create-movement", () => ({
    createIndividualMovement: vi.fn(),
}));

vi.mock("@/db/games/shared/actions/create-board-play", () => ({
    createBoardPlay: vi.fn(),
}));

vi.mock("@/db/games/shared/queries/find-player-for-starting-position", () => ({
    findPlayerForStartingPosition: vi.fn(),
}));

vi.mock("@/db/games/individual/actions/create-player-movement-map-entry", () => ({
    createIndividualPlayerMovementMapEntry: vi.fn(),
}));

vi.mock("@/db/games/pairs/queries/find-pair-for-player-id", () => ({
    findPairForPlayerId: vi.fn(),
}));

vi.mock("@/db/games/pairs/actions/create-pair-movement-map-entry", () => ({
    createPairMovementMapEntry: vi.fn(),
}));

import { getIndividualMovement, getTeamMovement } from "@/db/movements/queries/get-movement";
import { createBoardPlay } from "@/db/games/shared/actions/create-board-play";
import { registerSelectedMovementHandler } from "./select-movement.handler";

describe("registerSelectedMovementHandler (unit)", () => {
    let socket: any;

    beforeEach(() => {
        vi.clearAllMocks();

        socket = {
            on: vi.fn(),
        };
    });

    it("registers handler", () => {
        registerSelectedMovementHandler(socket);

        expect(socket.on).toHaveBeenCalledWith(
            SocketEvents.SELECT_MOVEMENT,
            expect.any(Function),
        );
    });

    it("handles INDIVIDUAL movement flow", async () => {
        registerSelectedMovementHandler(socket);

        const handler = socket.on.mock.calls[0][1];
        const cb = vi.fn();

        (getIndividualMovement as any).mockResolvedValue([
            {
                tableNumber: 1,
                rounds: [
                    {
                        roundNumber: 1,
                        n: 1,
                        s: 2,
                        e: 3,
                        w: 4,
                        boardStart: 1,
                        boardEnd: 2,
                    },
                ],
            },
        ]);

        await handler(
            { gameId: "g1", type: "INDIVIDUAL", id: 10 },
            cb,
        );

        expect(createBoardPlay).toHaveBeenCalledTimes(2); // board 1 & 2

        expect(cb).toHaveBeenCalledWith({ success: true });
    });

    it("handles invalid type gracefully (TEAM fallback)", async () => {
        registerSelectedMovementHandler(socket);

        const handler = socket.on.mock.calls[0][1];
        const cb = vi.fn();

        (getTeamMovement as any).mockResolvedValue([]);

        await handler(
            { gameId: "g1", type: "TEAM", id: 10 },
            cb,
        );

        expect(cb).toHaveBeenCalledWith({ success: true });
    });

    it("returns failure on error", async () => {
        registerSelectedMovementHandler(socket);

        const handler = socket.on.mock.calls[0][1];
        const cb = vi.fn();

        (getIndividualMovement as any).mockRejectedValue(
            new Error("fail"),
        );

        await handler(
            { gameId: "g1", type: "INDIVIDUAL", id: 1 },
            cb,
        );

        expect(cb).toHaveBeenCalledWith({ success: false });
    });
});
