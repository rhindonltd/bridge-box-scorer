import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----

vi.mock("@/services/start-game-service", () => ({
  startGame: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({ gameId: "g1" })),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { startGame } from "@/services/start-game-service";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerStartGameHandler } from "./start-game.handler";

function makeSocket() {
  return { data: {}, id: "s", on: vi.fn() };
}

function makeIo() {
  const emit = vi.fn();
  const io = { to: vi.fn(() => ({ emit })) };
  return { io, emit };
}

const validPayload = { gameId: "g1", directorToken: "test-token" };

describe("registerStartGameHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "g1",
    } as any);
  });

  it("registers on START_GAME", () => {
    const socket = makeSocket();
    const { io } = makeIo();
    registerStartGameHandler(socket as any, io as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.START_GAME,
      expect.any(Function),
    );
  });

  it("rejects an invalid director token", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);
    const socket = makeSocket();
    const { io } = makeIo();
    registerStartGameHandler(socket as any, io as any);
    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(validPayload, cb);

    expect(cb).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(startGame).not.toHaveBeenCalled();
  });

  it("starts, emits GAME_UPDATED, and returns success when valid", async () => {
    vi.mocked(startGame).mockResolvedValue({
      canStart: true,
      problems: [],
      sitOutSeat: null,
    });
    const socket = makeSocket();
    const { io, emit } = makeIo();
    registerStartGameHandler(socket as any, io as any);
    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(validPayload, cb);

    expect(startGame).toHaveBeenCalledWith("g1");
    expect(emit).toHaveBeenCalledWith(
      SocketEvents.GAME_UPDATED,
      expect.objectContaining({ game: expect.any(Object) }),
    );
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("returns problems and does not emit when invalid", async () => {
    const problems = [
      { code: "MULTIPLE_EMPTY_POSITIONS" as const, message: "too many gaps" },
    ];
    vi.mocked(startGame).mockResolvedValue({
      canStart: false,
      problems,
      sitOutSeat: null,
    });
    const socket = makeSocket();
    const { io, emit } = makeIo();
    registerStartGameHandler(socket as any, io as any);
    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(validPayload, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Game cannot be started",
      problems,
    });
    expect(emit).not.toHaveBeenCalled();
  });

  it("rejects an invalid payload", async () => {
    const socket = makeSocket();
    const { io } = makeIo();
    registerStartGameHandler(socket as any, io as any);
    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler({ gameId: "" }, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Invalid payload",
    });
    expect(startGame).not.toHaveBeenCalled();
  });

  it("returns an error when startGame throws", async () => {
    vi.mocked(startGame).mockRejectedValue(new Error("boom"));
    const socket = makeSocket();
    const { io } = makeIo();
    registerStartGameHandler(socket as any, io as any);
    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(validPayload, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Internal server error",
    });
  });
});
