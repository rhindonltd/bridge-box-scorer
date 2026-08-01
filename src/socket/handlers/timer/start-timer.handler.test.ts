import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/timer/game-store", () => ({
  getEngine: vi.fn(),
  createEngine: vi.fn(),
}));

vi.mock("@/db/games/shared/actions/update-timer-state", () => ({
  updateTimerState: vi.fn(),
}));

vi.mock("@/timer/scheduler", () => ({
  scheduleGame: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { getEngine } from "@/timer/game-store";
import { updateTimerState } from "@/db/games/shared/actions/update-timer-state";
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
    await handler({ gameType: "PAIRS", gameId: "game-1", directorToken: "test-token" });

    expect(mockEngine.start).toHaveBeenCalled();
    expect(updateTimerState).toHaveBeenCalledWith(
      "PAIRS",
      "game-1",
      mockState,
    );
    expect(io.to).toHaveBeenCalledWith("game:game-1");
    expect(io._emit).toHaveBeenCalledWith("timer:sync", expect.objectContaining(mockState));
    expect(scheduleGame).toHaveBeenCalledWith(
      "PAIRS",
      "game-1",
      mockEngine,
      expect.objectContaining({ updateTimerState, broadcast: expect.any(Function) }),
    );
  });

  it("does nothing if engine is not found", async () => {
    vi.mocked(getEngine).mockResolvedValue(null);

    const socket = createMockSocket();
    const io = createMockIo();

    registerStartTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({ gameType: "PAIRS", gameId: "game-1", directorToken: "test-token" });

    expect(updateTimerState).not.toHaveBeenCalled();
    expect(scheduleGame).not.toHaveBeenCalled();
  });

  it("does nothing if directorToken is invalid", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const socket = createMockSocket();
    const io = createMockIo();

    registerStartTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({ gameType: "PAIRS", gameId: "game-1", directorToken: "bad-token" });

    expect(getEngine).not.toHaveBeenCalled();
  });

  it("does nothing if payload is invalid (missing gameType)", async () => {
    const socket = createMockSocket();
    const io = createMockIo();

    registerStartTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({ gameId: "game-1", directorToken: "test-token" });

    expect(getEngine).not.toHaveBeenCalled();
  });

  it("does nothing if payload is invalid (empty gameId)", async () => {
    const socket = createMockSocket();
    const io = createMockIo();

    registerStartTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({ gameType: "PAIRS", gameId: "", directorToken: "test-token" });

    expect(getEngine).not.toHaveBeenCalled();
  });

  it("handles engine.start() throwing gracefully", async () => {
    const mockEngine = {
      start: vi.fn(() => { throw new Error("engine error"); }),
      getState: vi.fn(),
    };

    vi.mocked(getEngine).mockResolvedValue(mockEngine as any);

    const socket = createMockSocket();
    const io = createMockIo();

    registerStartTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    // Should not throw
    await handler({ gameType: "PAIRS", gameId: "game-1", directorToken: "test-token" });

    expect(updateTimerState).not.toHaveBeenCalled();
  });
});
