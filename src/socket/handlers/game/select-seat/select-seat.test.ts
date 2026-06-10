import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----
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

describe("registerSelectSeatHandler (unit)", () => {
  let socket: any;
  let io: any;

  beforeEach(() => {
    vi.clearAllMocks();

    socket = {
      on: vi.fn(),
    };

    io = {
      to: vi.fn(() => ({
        emit: vi.fn(),
      })),
    };
  });

  it("registers handler", () => {
    registerSelectSeatHandler(socket, io);

    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.SELECT_SEAT,
      expect.any(Function),
    );
  });

  it("creates player, seat, emits STARTING_POSITIONS, returns success", async () => {
    registerSelectSeatHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    (createPlayer as any).mockResolvedValue({ id: "p1" });
    (createInitialSeat as any).mockResolvedValue(undefined);
    (findPlayerInitialSeats as any).mockResolvedValue([
      { tableNumber: 1, player: "p1" },
    ]);

    await handler(
      {
        gameId: "game-1",
        playerInitialSeat: {
          tableNumber: 1,
          direction: "N",
          player: { name: "A" },
        },
      },
      cb,
    );

    expect(createPlayer).toHaveBeenCalledWith("INDIVIDUAL", "game-1", {
      name: "A",
    });

    expect(createInitialSeat).toHaveBeenCalledWith("INDIVIDUAL", "game-1", {
      tableNumber: 1,
      direction: "N",
      player: "p1",
    });

    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("handles errors and returns failure", async () => {
    registerSelectSeatHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    (createPlayer as any).mockRejectedValue(new Error("fail"));

    await handler(
      {
        gameId: "game-1",
        playerInitialSeat: {
          tableNumber: 1,
          direction: "N",
          player: { name: "A" },
        },
      },
      cb,
    );

    expect(cb).toHaveBeenCalledWith({
      success: false,
    });
  });
});
