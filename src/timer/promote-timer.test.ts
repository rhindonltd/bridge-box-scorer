import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games/queries/find-timer-state", () => ({
  findAllTimerStates: vi.fn(),
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

import { findAllTimerStates } from "@/db/games/queries/find-timer-state";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { createEngine } from "@/timer/game-store";
import { scheduleGame } from "@/timer/scheduler";
import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import {
  buildConfiguredTimerState,
  TimerState,
} from "@/timer/timer-state";
import { promoteTimerAtGameStart } from "./promote-timer";

function makeIo() {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit } as never;
}

const config = {
  boardsPerRound: 3,
  totalRounds: 5,
  playDuration: 420,
  moveDuration: 60,
};

/** A createEngine mock returning a ready-to-run "play" engine for the config. */
function readyEngine() {
  return new BridgeTimerEngine({
    ...buildConfiguredTimerState(config),
    phase: "play",
    remainingMs: config.playDuration * 1000,
  });
}

describe("promoteTimerAtGameStart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateTimerState).mockResolvedValue(undefined);
    vi.mocked(createEngine).mockImplementation(async () => readyEngine());
  });

  it("promotes every configured section into a running, scheduled timer", async () => {
    vi.mocked(findAllTimerStates).mockResolvedValue(
      new Map<string, TimerState>([
        ["A", buildConfiguredTimerState(config)],
        ["B", buildConfiguredTimerState(config)],
      ]),
    );

    await promoteTimerAtGameStart("g1", makeIo());

    expect(createEngine).toHaveBeenCalledTimes(2);
    expect(createEngine).toHaveBeenCalledWith(
      "g1",
      "A",
      3,
      5,
      420,
      60,
      expect.anything(),
    );
    expect(createEngine).toHaveBeenCalledWith(
      "g1",
      "B",
      3,
      5,
      420,
      60,
      expect.anything(),
    );
    expect(scheduleGame).toHaveBeenCalledTimes(2);
  });

  it("does nothing when no section has a configured timer", async () => {
    vi.mocked(findAllTimerStates).mockResolvedValue(new Map());

    await promoteTimerAtGameStart("g1", makeIo());

    expect(createEngine).not.toHaveBeenCalled();
    expect(scheduleGame).not.toHaveBeenCalled();
  });

  it("promotes only the configured section when another has none", async () => {
    // Only section A has a saved config (findAllTimerStates only returns
    // sections that have one).
    vi.mocked(findAllTimerStates).mockResolvedValue(
      new Map<string, TimerState>([["A", buildConfiguredTimerState(config)]]),
    );

    await promoteTimerAtGameStart("g1", makeIo());

    expect(createEngine).toHaveBeenCalledTimes(1);
    expect(createEngine).toHaveBeenCalledWith(
      "g1",
      "A",
      3,
      5,
      420,
      60,
      expect.anything(),
    );
  });

  it("does not re-promote a section whose timer is already live", async () => {
    const live: TimerState = {
      ...buildConfiguredTimerState(config),
      phase: "play",
      isRunning: true,
      phaseStartedAt: Date.now(),
      remainingMs: null,
    };
    vi.mocked(findAllTimerStates).mockResolvedValue(
      new Map<string, TimerState>([
        ["A", buildConfiguredTimerState(config)],
        ["B", live],
      ]),
    );

    await promoteTimerAtGameStart("g1", makeIo());

    // Only A (configured) is promoted; B (already live) is skipped.
    expect(createEngine).toHaveBeenCalledTimes(1);
    expect(createEngine).toHaveBeenCalledWith(
      "g1",
      "A",
      3,
      5,
      420,
      60,
      expect.anything(),
    );
  });

  it("promotes the healthy section even if another section throws", async () => {
    vi.mocked(findAllTimerStates).mockResolvedValue(
      new Map<string, TimerState>([
        ["A", buildConfiguredTimerState(config)],
        ["B", buildConfiguredTimerState(config)],
      ]),
    );
    // Section A's createEngine throws; B still succeeds.
    vi.mocked(createEngine)
      .mockRejectedValueOnce(new Error("boom"))
      .mockImplementationOnce(async () => readyEngine());
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await promoteTimerAtGameStart("g1", makeIo());

    expect(createEngine).toHaveBeenCalledTimes(2);
    // B was still scheduled despite A throwing.
    expect(scheduleGame).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });

  it("swallows a top-level load error so game start is never blocked", async () => {
    vi.mocked(findAllTimerStates).mockRejectedValue(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      promoteTimerAtGameStart("g1", makeIo()),
    ).resolves.toBeUndefined();

    errSpy.mockRestore();
  });
});
