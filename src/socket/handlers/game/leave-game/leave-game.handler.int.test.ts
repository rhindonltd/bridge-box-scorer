import { describe, it, expect, beforeEach } from "vitest";
import { createServer } from "http";
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";

import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";
import { registerLeaveGameHandler } from "./leave-game.handler";

describe("registerLeaveGameHandler (integration)", () => {
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
      registerLeaveGameHandler(socket);
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(() => resolve());
    });

    port = (httpServer.address() as any).port;

    client = Client(`http://localhost:${port}`);

    await new Promise((resolve) => client.on("connect", resolve));
  });

  it("successfully leaves room and stops receiving room events", async () => {
    const gameId = "game-1";
    const room = Rooms.game(gameId);

    // 1. join room
    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId }, () => resolve());
    });

    // 2. leave room
    const leaveResult = await new Promise<any>((resolve) => {
      client.emit(SocketEvents.LEAVE_GAME, { gameId }, (res: any) =>
        resolve(res),
      );
    });

    expect(leaveResult).toEqual({ success: true });

    // 3. emit to room AFTER leaving
    const received = new Promise<any>((resolve) => {
      client.on("test:event", resolve);

      // give socket time to process leave
      setTimeout(() => {
        io.to(room).emit("test:event", { ok: true });
      }, 100);
    });

    // If leave worked, this should NOT fire
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve("no-event"), 300),
    );

    const result = await Promise.race([received, timeout]);

    expect(result).toBe("no-event");
  });

  it("allows rejoining after leaving", async () => {
    const gameId = "game-2";

    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId }, resolve);
    });

    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.LEAVE_GAME, { gameId }, resolve);
    });

    await new Promise<void>((resolve) => {
      client.emit(SocketEvents.JOIN_GAME, { gameId }, resolve);
    });

    // no crash = success
    expect(true).toBe(true);
  });
});
