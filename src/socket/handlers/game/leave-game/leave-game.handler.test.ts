import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { registerLeaveGameHandler } from "@/socket/handlers/game/leave-game/leave-game.handler";

describe("registerLeaveGameHandler (unit)", () => {
  let socket: any;
  const io = {} as any;

  beforeEach(() => {
    socket = {
      on: vi.fn(),
      leave: vi.fn(),
    };
  });

  it("registers LEAVE_GAME handler", () => {
    registerLeaveGameHandler(socket as any, io);

    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.LEAVE_GAME,
      expect.any(Function),
    );
  });

  it("leaves correct room and returns success", async () => {
    registerLeaveGameHandler(socket as any, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler({ gameId: "game-1" }, cb);

    expect(socket.leave).toHaveBeenCalledWith(Rooms.game("game-1"));

    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: undefined,
    });
  });

  it("handles missing callback safely", async () => {
    registerLeaveGameHandler(socket as any, io);

    const handler = socket.on.mock.calls[0][1];

    await expect(
      handler({ gameId: "game-1" }, undefined),
    ).resolves.not.toThrow();

    expect(socket.leave).toHaveBeenCalled();
  });

  it("acks a generic failure when leave throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    socket.leave = vi.fn().mockImplementation(() => {
      throw new Error("leave failed");
    });

    registerLeaveGameHandler(socket as any, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler({ gameId: "game-1" }, cb);

    expect(cb).toHaveBeenCalledWith({ success: false, error: "Internal error" });
  });
});
