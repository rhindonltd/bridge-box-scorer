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
import { registerNextRoundHandler } from "./next-round.handler";

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

describe("registerNextRoundHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    await handler({ gameType: "INDIVIDUAL", gameId: "game-3" });

    expect(mockEngine.nextPhase).toHaveBeenCalled();
    expect(updateTimerState).toHaveBeenCalledWith(
      "INDIVIDUAL",
      "game-3",
      mockState,
    );
    expect(io.to).toHaveBeenCalledWith("game:game-3");
    expect(io._emit).toHaveBeenCalledWith(
      "timer:sync",
      expect.objectContaining(mockState),
    );
    expect(scheduleGame).toHaveBeenCalledWith(
      "INDIVIDUAL",
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
    await handler({ gameType: "INDIVIDUAL", gameId: "game-3" });

    expect(updateTimerState).not.toHaveBeenCalled();
  });

  it("does nothing if socket is not a director", async () => {
    const socket = createMockSocket();
    socket.data.isDirector = false;
    const io = createMockIo();

    registerNextRoundHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    await handler({ gameType: "INDIVIDUAL", gameId: "game-3" });

    expect(getEngine).not.toHaveBeenCalled();
  });
});
