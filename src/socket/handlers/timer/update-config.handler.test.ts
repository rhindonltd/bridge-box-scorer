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
import { registerUpdateConfigHandler } from "./update-config.handler";

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

describe("registerUpdateConfigHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: valid director session
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "game-5",
    } as any);
  });

  it("registers a handler for timer:updateConfig event", () => {
    const socket = createMockSocket();
    const io = createMockIo();

    registerUpdateConfigHandler(socket, io);

    expect(socket.on).toHaveBeenCalledWith(
      "timer:updateConfig",
      expect.any(Function),
    );
  });

  it("updates config, persists state, and broadcasts", async () => {
    const mockState = {
      isRunning: true,
      phase: "play",
      round: 1,
      boardsPerRound: 4,
      totalRounds: 6,
      playDuration: 480,
      moveDuration: 90,
    };
    const mockEngine = {
      updateConfig: vi.fn(),
      getState: vi.fn(() => mockState),
    };

    vi.mocked(getEngine).mockResolvedValue(mockEngine as any);
    vi.mocked(updateTimerState).mockResolvedValue(undefined);

    const socket = createMockSocket();
    const io = createMockIo();

    registerUpdateConfigHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-5",
      directorToken: "test-token",
      boardsPerRound: 4,
      totalRounds: 6,
      playDuration: 480,
      moveDuration: 90,
    });

    expect(mockEngine.updateConfig).toHaveBeenCalledWith(4, 6, 480, 90);
    expect(updateTimerState).toHaveBeenCalledWith(
      "PAIRS",
      "game-5",
      mockState,
    );
    expect(io.to).toHaveBeenCalledWith("game:game-5");
    expect(io._emit).toHaveBeenCalledWith(
      "timer:sync",
      expect.objectContaining(mockState),
    );
    expect(scheduleGame).toHaveBeenCalledWith(
      "PAIRS",
      "game-5",
      mockEngine,
      expect.objectContaining({ updateTimerState, broadcast: expect.any(Function) }),
    );
  });

  it("does nothing if engine is not found", async () => {
    vi.mocked(getEngine).mockResolvedValue(null);

    const socket = createMockSocket();
    const io = createMockIo();

    registerUpdateConfigHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-5",
      directorToken: "test-token",
      boardsPerRound: 4,
      totalRounds: 6,
      playDuration: 480,
      moveDuration: 90,
    });

    expect(updateTimerState).not.toHaveBeenCalled();
  });

  it("does nothing if directorToken is invalid", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const socket = createMockSocket();
    const io = createMockIo();

    registerUpdateConfigHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-5",
      directorToken: "bad-token",
      boardsPerRound: 4,
      totalRounds: 6,
      playDuration: 480,
      moveDuration: 90,
    });

    expect(getEngine).not.toHaveBeenCalled();
  });
});
