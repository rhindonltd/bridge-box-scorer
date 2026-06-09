import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

// ---- mocks ----
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
import { registerCreatePairHandler } from "@/socket/handlers/game/create-pair/create-pair.handler";

describe("registerCreatePairHandler", () => {
  let socket: any;
  let io: any;
  let handler: Function;

  beforeEach(() => {
    vi.clearAllMocks();

    socket = {
      on: vi.fn((event, cb) => {
        handler = cb;
      }),
    };

    io = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };
  });

  it("registers CREATE_PAIR handler", () => {
    registerCreatePairHandler(socket, io);

    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.CREATE_PAIR,
      expect.any(Function),
    );
  });

  it("creates pair + seats and emits starting positions (NS case)", async () => {
    const cb = vi.fn();

    const payload = {
      gameId: "game-1",
      pairInitialSeat: {
        tableNumber: 1,
        direction: "NS",
        pair: {
          player1: { name: "A" },
          player2: { name: "B" },
        },
      },
    };

    (createPlayer as any)
      .mockResolvedValueOnce({ id: "p1" })
      .mockResolvedValueOnce({ id: "p2" });

    (createPair as any).mockResolvedValue(undefined);
    (createInitialSeat as any).mockResolvedValue(undefined);

    (findPairInitialSeats as any).mockResolvedValue([
      { tableNumber: 1, player: "p1" },
    ]);

    registerCreatePairHandler(socket, io);

    await handler(payload, cb);

    // --- players created ---
    expect(createPlayer).toHaveBeenCalledWith(
      "PAIRS",
      "game-1",
      payload.pairInitialSeat.pair.player1,
    );

    expect(createPlayer).toHaveBeenCalledWith(
      "PAIRS",
      "game-1",
      payload.pairInitialSeat.pair.player2,
    );

    // --- pair created ---
    expect(createPair).toHaveBeenCalledWith("game-1", {
      player1: "p1",
      player2: "p2",
    });

    // --- seats created (NS => N/S) ---
    expect(createInitialSeat).toHaveBeenCalledWith("PAIRS", "game-1", {
      tableNumber: 1,
      direction: "N",
      player: "p1",
    });

    expect(createInitialSeat).toHaveBeenCalledWith("PAIRS", "game-1", {
      tableNumber: 1,
      direction: "S",
      player: "p2",
    });

    // --- emit room event ---
    expect(io.to).toHaveBeenCalledWith(Rooms.game("game-1"));

    expect(io.emit).toHaveBeenCalledWith(SocketEvents.STARTING_POSITIONS, {
      startingPositions: [{ tableNumber: 1, player: "p1" }],
    });

    // --- callback ---
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("uses E/W when direction is not NS (EW case)", async () => {
    const cb = vi.fn();

    const payload = {
      gameId: "game-2",
      pairInitialSeat: {
        tableNumber: 2,
        direction: "EW",
        pair: {
          player1: { name: "A" },
          player2: { name: "B" },
        },
      },
    };

    (createPlayer as any)
      .mockResolvedValueOnce({ id: "p1" })
      .mockResolvedValueOnce({ id: "p2" });

    (createPair as any).mockResolvedValue(undefined);
    (createInitialSeat as any).mockResolvedValue(undefined);
    (findPairInitialSeats as any).mockResolvedValue([]);

    registerCreatePairHandler(socket, io);

    await handler(payload, cb);

    expect(createInitialSeat).toHaveBeenCalledWith("PAIRS", "game-2", {
      tableNumber: 2,
      direction: "E",
      player: "p1",
    });

    expect(createInitialSeat).toHaveBeenCalledWith("PAIRS", "game-2", {
      tableNumber: 2,
      direction: "W",
      player: "p2",
    });

    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("still calls callback even if optional cb is undefined", async () => {
    const payload = {
      gameId: "game-3",
      pairInitialSeat: {
        tableNumber: 3,
        direction: "NS",
        pair: {
          player1: { name: "A" },
          player2: { name: "B" },
        },
      },
    };

    (createPlayer as any)
      .mockResolvedValueOnce({ id: "p1" })
      .mockResolvedValueOnce({ id: "p2" });

    (createPair as any).mockResolvedValue(undefined);
    (createInitialSeat as any).mockResolvedValue(undefined);
    (findPairInitialSeats as any).mockResolvedValue([]);

    registerCreatePairHandler(socket, io);

    await expect(handler(payload, undefined)).resolves.not.toThrow();
  });
});
