import { describe, it, expect, beforeEach } from "vitest";
import { createServer } from "http";
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";

import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";

describe("registerJoinGameHandler (integration)", () => {
    let httpServer: any;
    let io: Server;
    let client: any;
    let port: number;

    beforeEach(async () => {
        httpServer = createServer();

        io = new Server(httpServer, {
            cors: { origin: "*" },
        });

        io.on("connection", (socket) => {
            registerJoinGameHandler(socket);
        });

        await new Promise<void>((resolve) => {
            httpServer.listen(() => resolve());
        });

        port = (httpServer.address() as any).port;

        client = Client(`http://localhost:${port}`);

        await new Promise((resolve) => client.on("connect", resolve));
    });

    it("joins game room and confirms via callback", async () => {
        const gameId = "game-123";
        const room = Rooms.game(gameId);

        const result = await new Promise<any>((resolve) => {
            client.emit(
                SocketEvents.JOIN_GAME,
                { gameId },
                (response: any) => resolve(response),
            );
        });

        expect(result).toEqual({
            success: true,
        });

        // optional: verify room membership via a follow-up emit
        const received = await new Promise<any>((resolve) => {
            io.to(room).emit("test:event", { ok: true });

            client.on("test:event", resolve);
        });

        expect(received).toEqual({ ok: true });
    });

    it("handles multiple joins safely", async () => {
        const gameId = "game-456";

        await new Promise<any>((resolve) => {
            client.emit(
                SocketEvents.JOIN_GAME,
                { gameId },
                resolve,
            );
        });

        await new Promise<any>((resolve) => {
            client.emit(
                SocketEvents.JOIN_GAME,
                { gameId },
                resolve,
            );
        });

        // no crash = success
        expect(true).toBe(true);
    });
});
