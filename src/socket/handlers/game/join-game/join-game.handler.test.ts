import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";

describe("registerJoinGameHandler (unit)", () => {
  let socket: any;

  beforeEach(() => {
    socket = {
      on: vi.fn(),
      join: vi.fn(),
    };
  });

  it("registers JOIN_GAME handler", () => {
    registerJoinGameHandler(socket as any);

    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.JOIN_GAME,
      expect.any(Function),
    );
  });

  it("joins correct room and returns success", async () => {
    registerJoinGameHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];

    const cb = vi.fn();

    await handler({ gameId: "game-1" }, cb);

    expect(socket.join).toHaveBeenCalledWith(Rooms.game("game-1"));

    expect(cb).toHaveBeenCalledWith({
      success: true,
    });
  });

  it("handles missing callback safely", async () => {
    registerJoinGameHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];

    await expect(
      handler({ gameId: "game-1" }, undefined),
    ).resolves.not.toThrow();

    expect(socket.join).toHaveBeenCalled();
  });

  it("calls cb with success: false when join throws", async () => {
    socket.join = vi.fn().mockImplementation(() => {
      throw new Error("join failed");
    });

    registerJoinGameHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler({ gameId: "game-1" }, cb);

    expect(cb).toHaveBeenCalledWith({ success: false });
  });
});
