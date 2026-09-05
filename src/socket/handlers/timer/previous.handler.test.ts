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
import { registerPreviousHandler } from "./previous.handler";

function createMockSocket() {
  return { data: {}, id: "test", on: vi.fn() } as any;
}

function createMockIo() {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit } as any;
}

describe("registerPreviousHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "game-p",
    } as any);
  });

  it("registers a handler for timer:previous", () => {
    const socket = createMockSocket();
    registerPreviousHandler(socket, createMockIo());
    expect(socket.on).toHaveBeenCalledWith(
      "timer:previous",
      expect.any(Function),
    );
  });

  it("calls previousPhase by default, persists, broadcasts, reschedules", async () => {
    const mockState = { isRunning: false, phase: "move", round: 2 };
    const mockEngine = {
      previousPhase: vi.fn(),
      restartPhase: vi.fn(),
      getState: vi.fn(() => mockState),
    };
    vi.mocked(getEngine).mockResolvedValue(mockEngine as any);
    vi.mocked(updateTimerState).mockResolvedValue(undefined);

    const socket = createMockSocket();
    const io = createMockIo();
    registerPreviousHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-p",
      section: "A",
      directorToken: "test-token",
    });

    expect(mockEngine.previousPhase).toHaveBeenCalled();
    expect(mockEngine.restartPhase).not.toHaveBeenCalled();
    expect(updateTimerState).toHaveBeenCalledWith("game-p", "A", mockState);
    expect(io._emit).toHaveBeenCalledWith(
      "timer:sync",
      expect.objectContaining(mockState),
    );
    expect(scheduleGame).toHaveBeenCalled();
  });

  it("calls restartPhase when restart:true", async () => {
    const mockEngine = {
      previousPhase: vi.fn(),
      restartPhase: vi.fn(),
      getState: vi.fn(() => ({ phase: "play" })),
    };
    vi.mocked(getEngine).mockResolvedValue(mockEngine as any);

    const socket = createMockSocket();
    registerPreviousHandler(socket, createMockIo());

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-p",
      section: "A",
      directorToken: "test-token",
      restart: true,
    });

    expect(mockEngine.restartPhase).toHaveBeenCalled();
    expect(mockEngine.previousPhase).not.toHaveBeenCalled();
  });

  it("does nothing for an invalid director token", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const socket = createMockSocket();
    registerPreviousHandler(socket, createMockIo());

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-p",
      directorToken: "bad-token",
    });

    expect(getEngine).not.toHaveBeenCalled();
  });

  it("does nothing when the engine is missing", async () => {
    vi.mocked(getEngine).mockResolvedValue(null);

    const socket = createMockSocket();
    registerPreviousHandler(socket, createMockIo());

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-p",
      section: "A",
      directorToken: "test-token",
    });

    expect(updateTimerState).not.toHaveBeenCalled();
  });
});
