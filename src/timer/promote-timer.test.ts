import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games/queries/find-timer-state", () => ({
  findTimerState: vi.fn(),
}));

vi.mock("@/db/games/actions/update-timer-state", () => ({
  updateTimerState: vi.fn(),
}));

vi.mock("@/timer/game-store", () => ({
  createEngine: vi.fn(),
}));

vi.mock("@/timer/scheduler", () => ({
  scheduleGame: vi.fn(),
}));

import { findTimerState } from "@/db/games/queries/find-timer-state";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { createEngine } from "@/timer/game-store";
import { scheduleGame } from "@/timer/scheduler";
import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import { buildConfiguredTimerState, TimerState } from "@/timer/timer-state";
import { promoteTimerAtGameStart } from "./promote-timer";

function makeIo() {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit } as any;
}

const config = {
  boardsPerRound: 3,
  totalRounds: 5,
  playDuration: 420,
  moveDuration: 60,
};

describe("promoteTimerAtGameStart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("promotes a configured timer into a running, scheduled engine", async () => {
    vi.mocked(findTimerState).mockResolvedValue(
      buildConfiguredTimerState(config),
    );
    // createEngine always builds a fresh, ready-to-run "play" state (see
    // game-store), which promoteTimerAtGameStart then starts running.
    const engine = new BridgeTimerEngine({
      ...buildConfiguredTimerState(config),
      phase: "play",
      remainingMs: config.playDuration * 1000,
    });
    vi.mocked(createEngine).mockResolvedValue(engine);
    vi.mocked(updateTimerState).mockResolvedValue(undefined);

    const io = makeIo();
    await promoteTimerAtGameStart("g1", io);

    expect(createEngine).toHaveBeenCalledWith(
      "g1",
      3,
      5,
      420,
      60,
      expect.objectContaining({ breaks: [] }),
    );
    // Engine was started running.
    expect(engine.getState().isRunning).toBe(true);
    expect(engine.getState().phase).toBe("play");
    expect(updateTimerState).toHaveBeenCalledTimes(1);
    expect(scheduleGame).toHaveBeenCalledTimes(1);
  });

  it("does nothing when no timer was configured", async () => {
    vi.mocked(findTimerState).mockResolvedValue(null);

    const io = makeIo();
    await promoteTimerAtGameStart("g1", io);

    expect(createEngine).not.toHaveBeenCalled();
    expect(updateTimerState).not.toHaveBeenCalled();
    expect(scheduleGame).not.toHaveBeenCalled();
  });

  it("does not re-promote an already-live timer", async () => {
    const live: TimerState = {
      ...buildConfiguredTimerState(config),
      phase: "play",
      isRunning: true,
      phaseStartedAt: Date.now(),
      remainingMs: null,
    };
    vi.mocked(findTimerState).mockResolvedValue(live);

    const io = makeIo();
    await promoteTimerAtGameStart("g1", io);

    expect(createEngine).not.toHaveBeenCalled();
    expect(scheduleGame).not.toHaveBeenCalled();
  });

  it("does not re-promote a paused live timer (real phase, not running)", async () => {
    const pausedLive: TimerState = {
      ...buildConfiguredTimerState(config),
      phase: "play",
      isRunning: false,
      remainingMs: 120000,
    };
    vi.mocked(findTimerState).mockResolvedValue(pausedLive);

    const io = makeIo();
    await promoteTimerAtGameStart("g1", io);

    expect(createEngine).not.toHaveBeenCalled();
  });

  it("swallows errors so game start is never blocked", async () => {
    vi.mocked(findTimerState).mockRejectedValue(new Error("db down"));

    const io = makeIo();
    await expect(
      promoteTimerAtGameStart("g1", io),
    ).resolves.toBeUndefined();
  });
});
