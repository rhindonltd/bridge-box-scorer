import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/timer/game-store", () => ({
  getEngine: vi.fn(),
}));

vi.mock("@/db/games/shared/actions/update-timer-state", () => ({
  updateTimerState: vi.fn(),
}));

vi.mock("@/timer/scheduler", () => ({
  cancelGameSchedule: vi.fn(),
  scheduleGame: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { getEngine } from "@/timer/game-store";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { cancelGameSchedule } from "@/timer/scheduler";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerPauseTimerHandler } from "./pause-timer.handler";

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

describe("registerPauseTimerHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: valid director session
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "game-2",
    } as any);
  });

  it("registers a handler for timer:pause event", () => {
    const socket = createMockSocket();
    const io = createMockIo();

    registerPauseTimerHandler(socket, io);

    expect(socket.on).toHaveBeenCalledWith("timer:pause", expect.any(Function));
  });

  it("pauses the engine, cancels schedule, persists state, and broadcasts", async () => {
    const mockState = { isRunning: false, phase: "play", round: 1 };
    const mockEngine = {
      pause: vi.fn(),
      getState: vi.fn(() => mockState),
    };

    vi.mocked(getEngine).mockResolvedValue(mockEngine as any);
    vi.mocked(updateTimerState).mockResolvedValue(undefined);

    const socket = createMockSocket();
    const io = createMockIo();

    registerPauseTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-2",
      directorToken: "test-token",
    });

    expect(mockEngine.pause).toHaveBeenCalled();
    expect(cancelGameSchedule).toHaveBeenCalledWith("PAIRS", "game-2");
    expect(updateTimerState).toHaveBeenCalledWith("PAIRS", "game-2", mockState);
    expect(io.to).toHaveBeenCalledWith("game:game-2");
    expect(io._emit).toHaveBeenCalledWith(
      "timer:sync",
      expect.objectContaining(mockState),
    );
  });

  it("does nothing if engine is not found", async () => {
    vi.mocked(getEngine).mockResolvedValue(null);

    const socket = createMockSocket();
    const io = createMockIo();

    registerPauseTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-2",
      directorToken: "test-token",
    });

    expect(updateTimerState).not.toHaveBeenCalled();
  });

  it("does nothing if directorToken is invalid", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const socket = createMockSocket();
    const io = createMockIo();

    registerPauseTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-2",
      directorToken: "bad-token",
    });

    expect(getEngine).not.toHaveBeenCalled();
  });

  it("does nothing if payload is invalid", async () => {
    const socket = createMockSocket();
    const io = createMockIo();

    registerPauseTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({ invalid: true });

    expect(getEngine).not.toHaveBeenCalled();
  });

  it("catches and logs errors from engine.pause()", async () => {
    const mockEngine = {
      pause: vi.fn().mockImplementation(() => {
        throw new Error("pause error");
      }),
      getState: vi.fn(),
    };

    vi.mocked(getEngine).mockResolvedValue(mockEngine as any);

    const socket = createMockSocket();
    const io = createMockIo();

    registerPauseTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-2",
      directorToken: "test-token",
    });

    expect(updateTimerState).not.toHaveBeenCalled();
  });
});
