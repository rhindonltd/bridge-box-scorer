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

import { createEngine } from "@/timer/game-store";
import { updateTimerState } from "@/db/games/shared/actions/update-timer-state";
import { scheduleGame } from "@/timer/scheduler";
import { registerCreateTimerHandler } from "./create-timer.handler";

function createMockSocket() {
  return {
    data: { isDirector: true },
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

describe("registerCreateTimerHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a handler for timer:create event", () => {
    const socket = createMockSocket();
    const io = createMockIo();

    registerCreateTimerHandler(socket, io);

    expect(socket.on).toHaveBeenCalledWith(
      "timer:create",
      expect.any(Function),
    );
  });

  it("creates an engine, persists state, and broadcasts", async () => {
    const mockState = { isRunning: false, phase: "play", round: 1 };
    const mockEngine = {
      getState: vi.fn(() => mockState),
    };

    vi.mocked(createEngine).mockResolvedValue(mockEngine as any);
    vi.mocked(updateTimerState).mockResolvedValue(undefined);

    const socket = createMockSocket();
    const io = createMockIo();

    registerCreateTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-4",
      boardsPerRound: 3,
      totalRounds: 5,
      playDuration: 420,
      moveDuration: 60,
    });

    expect(createEngine).toHaveBeenCalledWith(
      "PAIRS",
      "game-4",
      3,
      5,
      420,
      60,
    );
    expect(updateTimerState).toHaveBeenCalledWith("PAIRS", "game-4", mockState);
    expect(io.to).toHaveBeenCalledWith("game:game-4");
    expect(io._emit).toHaveBeenCalledWith(
      "timer:sync",
      expect.objectContaining(mockState),
    );
    expect(scheduleGame).toHaveBeenCalledWith(
      "PAIRS",
      "game-4",
      mockEngine,
      expect.objectContaining({ updateTimerState, broadcast: expect.any(Function) }),
    );
  });

  it("does nothing if socket is not a director", async () => {
    const socket = createMockSocket();
    socket.data.isDirector = false;
    const io = createMockIo();

    registerCreateTimerHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({
      gameType: "PAIRS",
      gameId: "game-4",
      boardsPerRound: 3,
      totalRounds: 5,
      playDuration: 420,
      moveDuration: 60,
    });

    expect(createEngine).not.toHaveBeenCalled();
  });
});
