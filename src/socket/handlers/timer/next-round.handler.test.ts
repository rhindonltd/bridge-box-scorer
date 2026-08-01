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
import { registerNextRoundHandler } from "./next-round.handler";

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

describe("registerNextRoundHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: valid director session
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "game-3",
    } as any);
  });

  it("registers a handler for timer:nextRound event", () => {
    const socket = createMockSocket();
    const io = createMockIo();

    registerNextRoundHandler(socket, io);

    expect(socket.on).toHaveBeenCalledWith(
      "timer:nextRound",
      expect.any(Function),
    );
  });

  it("advances the engine phase, persists state, and broadcasts", async () => {
    const mockState = { isRunning: true, phase: "move", round: 2 };
    const mockEngine = {
      nextPhase: vi.fn(),
      getState: vi.fn(() => mockState),
    };

    vi.mocked(getEngine).mockResolvedValue(mockEngine as any);
    vi.mocked(updateTimerState).mockResolvedValue(undefined);

    const socket = createMockSocket();
    const io = createMockIo();

    registerNextRoundHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({ gameType: "PAIRS", gameId: "game-3", directorToken: "test-token" });

    expect(mockEngine.nextPhase).toHaveBeenCalled();
    expect(updateTimerState).toHaveBeenCalledWith(
      "PAIRS",
      "game-3",
      mockState,
    );
    expect(io.to).toHaveBeenCalledWith("game:game-3");
    expect(io._emit).toHaveBeenCalledWith(
      "timer:sync",
      expect.objectContaining(mockState),
    );
    expect(scheduleGame).toHaveBeenCalledWith(
      "PAIRS",
      "game-3",
      mockEngine,
      expect.objectContaining({ updateTimerState, broadcast: expect.any(Function) }),
    );
  });

  it("does nothing if engine is not found", async () => {
    vi.mocked(getEngine).mockResolvedValue(null);

    const socket = createMockSocket();
    const io = createMockIo();

    registerNextRoundHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({ gameType: "PAIRS", gameId: "game-3", directorToken: "test-token" });

    expect(updateTimerState).not.toHaveBeenCalled();
  });

  it("does nothing if directorToken is invalid", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const socket = createMockSocket();
    const io = createMockIo();

    registerNextRoundHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({ gameType: "PAIRS", gameId: "game-3", directorToken: "bad-token" });

    expect(getEngine).not.toHaveBeenCalled();
  });

  it("does nothing if payload is invalid", async () => {
    const socket = createMockSocket();
    const io = createMockIo();

    registerNextRoundHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({ invalid: true });

    expect(getEngine).not.toHaveBeenCalled();
  });

  it("catches and logs errors from engine operations", async () => {
    const mockEngine = {
      nextPhase: vi.fn().mockImplementation(() => { throw new Error("next phase error"); }),
      getState: vi.fn(),
    };

    vi.mocked(getEngine).mockResolvedValue(mockEngine as any);

    const socket = createMockSocket();
    const io = createMockIo();

    registerNextRoundHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({ gameType: "PAIRS", gameId: "game-3", directorToken: "test-token" });

    expect(updateTimerState).not.toHaveBeenCalled();
  });
});
