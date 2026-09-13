import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/timer/game-store", () => ({
  getEngine: vi.fn(),
  createEngine: vi.fn(),
}));

vi.mock("@/db/games/actions/update-timer-state", () => ({
  updateTimerState: vi.fn(),
}));

vi.mock("@/timer/scheduler", () => ({
  scheduleGame: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { getEngine } from "@/timer/game-store";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { scheduleGame } from "@/timer/scheduler";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerStartTimerHandler } from "./start-timer.handler";

function createMockSocket() {
  return {
    data: {},
    id: "test",
    on: vi.fn(),
  } as any;
}

function createMockIo() {
  const emit = vi.fn();
  return {
    to: vi.fn(() => ({ emit })),
    _emit: emit,
  } as any;
}

describe("registerStartTimerHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: valid director session
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "game-1",
    } as any);
  });

  it("registers a handler for timer:start event", () => {
    const socket = createMockSocket();
    const io = createMockIo();

    registerStartTimerHandler(socket, io);

    expect(socket.on).toHaveBeenCalledWith("timer:start", expect.any(Function));
  });

  it("starts the engine, persists state, and broadcasts", async () => {
    const mockState = { isRunning: true, phase: "play", round: 1 };
    const mockEngine = {
      start: vi.fn(),
      getState: vi.fn(() => mockState),
    };

    vi.mocked(getEngine).mockResolvedValue(mockEngine as any);
    vi.mocked(updateTimerState).mockResolvedValue(undefined);

    const socket = createMockSocket();
    const io = createMockIo();

    registerStartTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(
      {
        gameType: "PAIRS",
        gameId: "game-1",
        section: "A",
        directorToken: "test-token",
      },
      cb,
    );

    expect(mockEngine.start).toHaveBeenCalled();
    // The control is acknowledged so the client's emitWithAck resolves.
    expect(cb).toHaveBeenCalledWith({ success: true, data: undefined });
    expect(updateTimerState).toHaveBeenCalledWith("game-1", "A", mockState);
    expect(io.to).toHaveBeenCalledWith("game:game-1:timer:A");
    expect(io._emit).toHaveBeenCalledWith(
      "timer:sync",
      expect.objectContaining(mockState),
    );
    expect(scheduleGame).toHaveBeenCalledWith(
      "game-1",
      "A",
      mockEngine,
      expect.objectContaining({
        updateTimerState,
        broadcast: expect.any(Function),
      }),
    );
  });

  it("does nothing if engine is not found", async () => {
    vi.mocked(getEngine).mockResolvedValue(null);

    const socket = createMockSocket();
    const io = createMockIo();

    registerStartTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(
      {
        gameType: "PAIRS",
        gameId: "game-1",
        section: "A",
        directorToken: "test-token",
      },
      cb,
    );

    expect(updateTimerState).not.toHaveBeenCalled();
    expect(scheduleGame).not.toHaveBeenCalled();
    // A missing live timer is acked as a user-facing failure.
    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Timer not found",
    });
  });

  it("does nothing if directorToken is invalid", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const socket = createMockSocket();
    const io = createMockIo();

    registerStartTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(
      {
        gameType: "PAIRS",
        gameId: "game-1",
        section: "A",
        directorToken: "bad-token",
      },
      cb,
    );

    expect(getEngine).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
  });

  it("rejects an invalid payload (missing gameType) without touching the engine", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const socket = createMockSocket();
    const io = createMockIo();

    registerStartTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "game-1", section: "A", directorToken: "t" }, cb);

    expect(getEngine).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Invalid request",
    });
  });

  it("rejects an invalid payload (empty gameId) without touching the engine", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const socket = createMockSocket();
    const io = createMockIo();

    registerStartTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(
      { gameType: "PAIRS", gameId: "", section: "A", directorToken: "t" },
      cb,
    );

    expect(getEngine).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Invalid request",
    });
  });

  it("acks a generic failure when engine.start() throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mockEngine = {
      start: vi.fn(() => {
        throw new Error("engine error");
      }),
      getState: vi.fn(),
    };

    vi.mocked(getEngine).mockResolvedValue(mockEngine as any);

    const socket = createMockSocket();
    const io = createMockIo();

    registerStartTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    // Should not throw; the wrapper catches and acks a generic failure.
    await handler(
      {
        gameType: "PAIRS",
        gameId: "game-1",
        section: "A",
        directorToken: "test-token",
      },
      cb,
    );

    expect(updateTimerState).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Internal error",
    });
  });
});
