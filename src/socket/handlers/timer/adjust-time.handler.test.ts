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
import { registerAdjustTimeHandler } from "./adjust-time.handler";

function createMockSocket() {
  return { data: {}, id: "test", on: vi.fn() } as any;
}

function createMockIo() {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit } as any;
}

describe("registerAdjustTimeHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "game-a",
    } as any);
  });

  it("registers a handler for timer:adjustTime", () => {
    const socket = createMockSocket();
    registerAdjustTimeHandler(socket, createMockIo());
    expect(socket.on).toHaveBeenCalledWith(
      "timer:adjustTime",
      expect.any(Function),
    );
  });

  it("converts seconds to ms and forwards the apply-to-future flag", async () => {
    const mockState = { phase: "play", remainingMs: 360_000 };
    const mockEngine = {
      adjustTime: vi.fn(),
      getState: vi.fn(() => mockState),
    };
    vi.mocked(getEngine).mockResolvedValue(mockEngine as any);
    vi.mocked(updateTimerState).mockResolvedValue(undefined);

    const socket = createMockSocket();
    const io = createMockIo();
    registerAdjustTimeHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-a",
      directorToken: "test-token",
      deltaSeconds: 60,
      applyToFutureSameType: true,
    });

    expect(mockEngine.adjustTime).toHaveBeenCalledWith(60_000, true);
    expect(updateTimerState).toHaveBeenCalledWith("game-a", mockState);
    expect(io._emit).toHaveBeenCalledWith(
      "timer:sync",
      expect.objectContaining(mockState),
    );
    expect(scheduleGame).toHaveBeenCalled();
  });

  it("handles negative deltas and defaults apply-to-future to false", async () => {
    const mockEngine = {
      adjustTime: vi.fn(),
      getState: vi.fn(() => ({ phase: "play" })),
    };
    vi.mocked(getEngine).mockResolvedValue(mockEngine as any);

    const socket = createMockSocket();
    registerAdjustTimeHandler(socket, createMockIo());

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-a",
      directorToken: "test-token",
      deltaSeconds: -15,
    });

    expect(mockEngine.adjustTime).toHaveBeenCalledWith(-15_000, false);
  });

  it("rejects a non-integer delta payload", async () => {
    const socket = createMockSocket();
    registerAdjustTimeHandler(socket, createMockIo());

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-a",
      directorToken: "test-token",
      deltaSeconds: 12.5,
    });

    expect(getEngine).not.toHaveBeenCalled();
  });

  it("does nothing for an invalid director token", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const socket = createMockSocket();
    registerAdjustTimeHandler(socket, createMockIo());

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-a",
      directorToken: "bad-token",
      deltaSeconds: 60,
    });

    expect(getEngine).not.toHaveBeenCalled();
  });
});
