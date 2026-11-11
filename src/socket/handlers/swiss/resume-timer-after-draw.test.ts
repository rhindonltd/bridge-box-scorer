import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetEngine = vi.fn();
vi.mock("@/timer/game-store", () => ({
  getEngine: (...a: unknown[]) => mockGetEngine(...a),
}));
const mockScheduleGame = vi.fn();
const mockCancelGameSchedule = vi.fn();
vi.mock("@/timer/scheduler", () => ({
  scheduleGame: (...a: unknown[]) => mockScheduleGame(...a),
  cancelGameSchedule: (...a: unknown[]) => mockCancelGameSchedule(...a),
}));
const mockUpdateTimerState = vi.fn();
vi.mock("@/db/games/actions/update-timer-state", () => ({
  updateTimerState: (...a: unknown[]) => mockUpdateTimerState(...a),
}));
const mockBroadcast = vi.fn();
vi.mock("@/socket/handlers/timer/broadcast-timer", () => ({
  makeTimerBroadcaster: () => mockBroadcast,
}));
const mockLoggerError = vi.fn();
vi.mock("@/lib/log", () => ({
  logger: { error: (...a: unknown[]) => mockLoggerError(...a) },
}));

import { resumeTimerAfterDraw } from "./resume-timer-after-draw";

const io = {} as never;

function fakeEngine(phase: string) {
  return {
    getState: vi.fn(() => ({ phase })),
    resumeAfterDraw: vi.fn(),
  };
}

describe("resumeTimerAfterDraw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when the section has no engine", async () => {
    mockGetEngine.mockResolvedValue(undefined);
    await resumeTimerAfterDraw(io, "g1", "A");
    expect(mockUpdateTimerState).not.toHaveBeenCalled();
    expect(mockScheduleGame).not.toHaveBeenCalled();
  });

  it("does nothing when the timer is not awaiting a draw", async () => {
    const engine = fakeEngine("play");
    mockGetEngine.mockResolvedValue(engine);
    await resumeTimerAfterDraw(io, "g1", "A");
    expect(engine.resumeAfterDraw).not.toHaveBeenCalled();
    expect(mockUpdateTimerState).not.toHaveBeenCalled();
    expect(mockBroadcast).not.toHaveBeenCalled();
    expect(mockScheduleGame).not.toHaveBeenCalled();
  });

  it("resumes, persists, broadcasts and re-arms the scheduler", async () => {
    const engine = fakeEngine("awaitingDraw");
    mockGetEngine.mockResolvedValue(engine);
    await resumeTimerAfterDraw(io, "g1", "A");
    expect(engine.resumeAfterDraw).toHaveBeenCalledTimes(1);
    expect(mockUpdateTimerState).toHaveBeenCalledWith("g1", "A", {
      phase: "awaitingDraw",
    });
    expect(mockBroadcast).toHaveBeenCalledWith("g1", "A", {
      phase: "awaitingDraw",
    });
    expect(mockCancelGameSchedule).toHaveBeenCalledWith("g1", "A");
    expect(mockScheduleGame).toHaveBeenCalledWith("g1", "A", engine, {
      updateTimerState: expect.any(Function),
      broadcast: mockBroadcast,
    });
  });

  it("logs and swallows a failure so the draw commit is not failed", async () => {
    const boom = new Error("db down");
    mockGetEngine.mockRejectedValue(boom);
    await expect(resumeTimerAfterDraw(io, "g1", "A")).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledWith(
      { err: boom, gameId: "g1", section: "A" },
      "Failed to resume timer after Swiss draw",
    );
  });
});
