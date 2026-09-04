import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/timer/game-store", () => ({
  getEngine: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { getEngine } from "@/timer/game-store";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerRequestStateHandler } from "./request-state.handler";

function createMockSocket() {
  return { data: {}, id: "test", on: vi.fn() } as any;
}

function createMockIo() {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit } as any;
}

const timerState = {
  version: 1,
  phase: "play",
  board: 1,
  round: 1,
  boardsPerRound: 3,
  totalRounds: 5,
  playDuration: 420,
  moveDuration: 60,
  breaks: [],
  isRunning: false,
  phaseStartedAt: null,
  remainingMs: 420_000,
  breakDurationMs: null,
};

describe("registerRequestStateHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a handler for timer:requestState", () => {
    const socket = createMockSocket();
    registerRequestStateHandler(socket, createMockIo());
    expect(socket.on).toHaveBeenCalledWith(
      "timer:requestState",
      expect.any(Function),
    );
  });

  it("acks the current snapshot when a timer exists", async () => {
    vi.mocked(getEngine).mockResolvedValue({
      getState: () => timerState,
    } as any);

    const socket = createMockSocket();
    registerRequestStateHandler(socket, createMockIo());

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "game-1" }, cb);

    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        phase: "play",
        round: 1,
        serverNow: expect.any(Number),
        breakProblems: [],
      }),
    });
  });

  it("acks null data when no timer exists", async () => {
    vi.mocked(getEngine).mockResolvedValue(null);

    const socket = createMockSocket();
    registerRequestStateHandler(socket, createMockIo());

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "game-1" }, cb);

    expect(cb).toHaveBeenCalledWith({ success: true, data: null });
  });

  it("does not require director auth (read-only)", async () => {
    vi.mocked(getEngine).mockResolvedValue(null);

    const socket = createMockSocket();
    registerRequestStateHandler(socket, createMockIo());

    const handler = socket.on.mock.calls[0][1];
    await handler({ gameId: "game-1" }, vi.fn());

    expect(findLoginSession).not.toHaveBeenCalled();
  });

  it("rejects an invalid payload", async () => {
    const socket = createMockSocket();
    registerRequestStateHandler(socket, createMockIo());

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ notAGameId: true }, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: expect.any(String),
    });
    expect(getEngine).not.toHaveBeenCalled();
  });

  it("acks null data if loading the engine throws", async () => {
    vi.mocked(getEngine).mockRejectedValue(new Error("db down"));

    const socket = createMockSocket();
    registerRequestStateHandler(socket, createMockIo());

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "game-1" }, cb);

    expect(cb).toHaveBeenCalledWith({ success: true, data: null });
  });

  it("does not throw when no callback is provided", async () => {
    vi.mocked(getEngine).mockResolvedValue(null);

    const socket = createMockSocket();
    registerRequestStateHandler(socket, createMockIo());

    const handler = socket.on.mock.calls[0][1];
    await expect(handler({ gameId: "game-1" }, undefined)).resolves.not.toThrow();
  });
});
