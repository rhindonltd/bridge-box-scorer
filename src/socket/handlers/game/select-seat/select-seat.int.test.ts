import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServer } from "http";
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";

import { SocketEvents } from "@/socket/socket-events";

// ---- mock DB only ----
vi.mock("@/db/games/shared/actions/create-player", () => ({
  createPlayer: vi.fn(),
}));

vi.mock("@/db/games/shared/actions/create-initial-seat", () => ({
  createInitialSeat: vi.fn(),
}));

vi.mock("@/db/games/shared/queries/find-player-initial-seats", () => ({
  findPlayerInitialSeats: vi.fn(),
}));

import { createPlayer } from "@/db/games/shared/actions/create-player";
import { createInitialSeat } from "@/db/games/shared/actions/create-initial-seat";
import { findPlayerInitialSeats } from "@/db/games/shared/queries/find-player-initial-seats";
import { registerSelectSeatHandler } from "./select-seat";
import { Rooms } from "@/socket/rooms";

describe("registerSelectSeatHandler (integration)", () => {
  let httpServer: any;
  let io: Server;
  let client: any;

  beforeEach(async () => {
    httpServer = createServer();

    io = new Server(httpServer, {
      cors: { origin: "*" },
    });

    io.on("connection", (socket) => {
      socket.on("join", (room: string) => {
        socket.join(room);
      });

      registerSelectSeatHandler(socket, io);
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(() => resolve());
    });

    const port = (httpServer.address() as any).port;
    client = Client(`http://localhost:${port}`);

    await new Promise((r) => client.on("connect", r));
  });

  it("emits STARTING_POSITIONS after selecting seat", async () => {
    (createPlayer as any).mockResolvedValue({ id: "p1" });
    (createInitialSeat as any).mockResolvedValue(undefined);
    (findPlayerInitialSeats as any).mockResolvedValue([
      { tableNumber: 1, player: "p1" },
    ]);

    const emitted = new Promise<any>((resolve) => {
      client.on(SocketEvents.STARTING_POSITIONS, resolve);
    });

    client.emit("join", Rooms.game("game-1"));

    const response = await new Promise<any>((resolve) => {
      client.emit(
        SocketEvents.SELECT_SEAT,
        {
          gameId: "game-1",
          playerInitialSeat: {
            tableNumber: 1,
            direction: "N",
            player: { name: "A" },
          },
        },
        resolve,
      );
    });

    expect(response).toEqual({ success: true });

    const event = await emitted;

    expect(event).toEqual({
      startingPositions: [{ tableNumber: 1, player: "p1" }],
    });
  });

  it("handles failure gracefully", async () => {
    (createPlayer as any).mockRejectedValue(new Error("fail"));

    const response = await new Promise<any>((resolve) => {
      client.emit(
        SocketEvents.SELECT_SEAT,
        {
          gameId: "game-1",
          playerInitialSeat: {
            tableNumber: 1,
            direction: "N",
            player: { name: "A" },
          },
        },
        resolve,
      );
    });

    expect(response).toEqual({
      success: false,
    });
  });
});
