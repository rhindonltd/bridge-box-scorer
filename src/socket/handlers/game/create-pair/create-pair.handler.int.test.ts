import { describe, it, expect, vi, beforeEach } from "vitest";

import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { emitWithAck, waitForEvent } from "@/socket/test/socket-helpers";

import { SocketEvents } from "@/socket/socket-events";
import { registerCreatePairHandler } from "./create-pair.handler";

// ---- mocks (still mock DB only) ----
vi.mock("@/db/games/shared/actions/create-player", () => ({
  createPlayer: vi.fn(),
}));

vi.mock("@/db/games/pairs/actions/create-pair", () => ({
  createPair: vi.fn(),
}));

vi.mock("@/db/games/shared/actions/create-initial-seat", () => ({
  createInitialSeat: vi.fn(),
}));

vi.mock("@/db/games/pairs/queries/find-pair-initial-seats", () => ({
  findPairInitialSeats: vi.fn(),
}));

import { createPlayer } from "@/db/games/shared/actions/create-player";
import { createPair } from "@/db/games/pairs/actions/create-pair";
import { createInitialSeat } from "@/db/games/shared/actions/create-initial-seat";
import { findPairInitialSeats } from "@/db/games/pairs/queries/find-pair-initial-seats";
import { Rooms } from "@/socket/rooms";

describe("registerCreatePairHandler (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates pair and emits STARTING_POSITIONS to room", async () => {
    // ---- arrange DB mocks ----
    (createPlayer as any)
      .mockResolvedValueOnce({ id: "p1" })
      .mockResolvedValueOnce({ id: "p2" });

    (createPair as any).mockResolvedValue(undefined);
    (createInitialSeat as any).mockResolvedValue(undefined);

    (findPairInitialSeats as any).mockResolvedValue([
      { tableNumber: 1, player: "p1" },
    ]);

      const { io, client, close } = await createSocketTestServer((io) => {
          io.on("connection", (socket) => {
              socket.on("join", (room: string) => {
                  socket.join(room);
              });

              registerCreatePairHandler(socket, io);
          });
      });

    // ---- listen for emitted event ----
    const emittedPromise = waitForEvent(
      client,
      SocketEvents.STARTING_POSITIONS,
    );

      client.emit("join", Rooms.game("game-1"));

    // ---- act ----
    const response = await emitWithAck(client, SocketEvents.CREATE_PAIR, {
      gameId: "game-1",
      pairInitialSeat: {
        tableNumber: 1,
        direction: "NS",
        pair: {
          player1: { name: "A" },
          player2: { name: "B" },
        },
      },
    });

    // ---- assert callback ----
    expect(response).toEqual({ success: true });

    // ---- assert broadcast ----
    const emitted = await emittedPromise;

    expect(emitted).toEqual({
      startingPositions: [{ tableNumber: 1, player: "p1" }],
    });

    // ---- assert DB calls ----
    expect(createPlayer).toHaveBeenCalledTimes(2);
    expect(createPair).toHaveBeenCalledTimes(1);
    expect(createInitialSeat).toHaveBeenCalledTimes(2);

    await close();
  });

  it("still responds successfully even if no listeners exist", async () => {
    (createPlayer as any)
      .mockResolvedValueOnce({ id: "p1" })
      .mockResolvedValueOnce({ id: "p2" });

    (createPair as any).mockResolvedValue(undefined);
    (createInitialSeat as any).mockResolvedValue(undefined);
    (findPairInitialSeats as any).mockResolvedValue([]);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket) => {
        registerCreatePairHandler(socket, io);
      });
    });

    const response = await emitWithAck(client, SocketEvents.CREATE_PAIR, {
      gameId: "game-2",
      pairInitialSeat: {
        tableNumber: 2,
        direction: "EW",
        pair: {
          player1: { name: "A" },
          player2: { name: "B" },
        },
      },
    });

    expect(response).toEqual({ success: true });

    await close();
  });
});
