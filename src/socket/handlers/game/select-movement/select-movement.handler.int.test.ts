import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServer } from "http";
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";

import { SocketEvents } from "@/socket/socket-events";

// ---- mock heavy DB layer only ----
vi.mock("@/db/movements/queries/get-movement", () => ({
    getIndividualMovement: vi.fn(),
}));

vi.mock("@/db/games/shared/actions/create-board-play", () => ({
    createBoardPlay: vi.fn(),
}));

import { getIndividualMovement } from "@/db/movements/queries/get-movement";
import { registerSelectedMovementHandler } from "./select-movement.handler";

describe("registerSelectedMovementHandler (integration)", () => {
    let httpServer: any;
    let io: Server;
    let client: any;

    beforeEach(async () => {
        httpServer = createServer();

        io = new Server(httpServer, {
            cors: { origin: "*" },
        });

        io.on("connection", (socket) => {
            registerSelectedMovementHandler(socket);
        });

        await new Promise<void>((resolve) => {
            httpServer.listen(() => resolve());
        });

        const port = (httpServer.address() as any).port;
        client = Client(`http://localhost:${port}`);

        await new Promise((r) => client.on("connect", r));
    });

    // it("processes INDIVIDUAL movement successfully", async () => {
    //     (getIndividualMovement as any).mockResolvedValue([
    //         {
    //             tableNumber: 1,
    //             rounds: [
    //                 {
    //                     roundNumber: 1,
    //                     n: 1,
    //                     s: 2,
    //                     e: 3,
    //                     w: 4,
    //                     boardStart: 1,
    //                     boardEnd: 1,
    //                 },
    //             ],
    //         },
    //     ]);
    //
    //     const result = await new Promise<any>((resolve) => {
    //         client.emit(
    //             SocketEvents.SELECT_MOVEMENT,
    //             {
    //                 gameId: "g1",
    //                 type: "INDIVIDUAL",
    //                 id: 1,
    //             },
    //             resolve,
    //         );
    //     });
    //
    //     expect(result).toEqual({ success: true });
    // });

    it("handles errors gracefully", async () => {
        (getIndividualMovement as any).mockRejectedValue(
            new Error("boom"),
        );

        const result = await new Promise<any>((resolve) => {
            client.emit(
                SocketEvents.SELECT_MOVEMENT,
                {
                    gameId: "g1",
                    type: "INDIVIDUAL",
                    id: 1,
                },
                resolve,
            );
        });

        expect(result).toEqual({ success: false });
    });
});
