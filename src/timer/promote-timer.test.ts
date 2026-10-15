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

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: vi.fn(),
}));

vi.mock("@/db/games/queries/get-section-movement", () => ({
  getSectionMovement: vi.fn(),
}));

vi.mock("@/timer/default-timer-config", () => ({
  buildDefaultTimerConfigFor: vi.fn(),
}));

import { findAllTimerStates } from "@/db/games/queries/find-timer-state";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { createEngine } from "@/timer/game-store";
import { scheduleGame } from "@/timer/scheduler";
import { getDb } from "@/db/games";
import { findSections } from "@/db/games/queries/find-sections";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { buildDefaultTimerConfigFor } from "@/timer/default-timer-config";
import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import {
  buildConfiguredTimerState,
  TimerConfig,
  TimerState,
} from "@/timer/timer-state";
import type { SelectedMovement } from "@/model/selected-movement";
import { promoteTimerAtGameStart } from "./promote-timer";

function makeIo() {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit } as never;
}

const config: TimerConfig = {
  boardsPerRound: 3,
  totalRounds: 5,
  playDuration: 420,
  moveDuration: 60,
};

/** A createEngine mock returning a ready-to-run "play" engine for a config. */
function readyEngine(c: TimerConfig = config) {
  return new BridgeTimerEngine({
    ...buildConfiguredTimerState(c),
    phase: "play",
    remainingMs: c.playDuration * 1000,
  });
}

/** Declare the sections present for a game (letters only — the rest is unused). */
function sectionsAre(...letters: string[]) {
  vi.mocked(findSections).mockResolvedValue(
    letters.map((section, i) => ({
      section,
      label: section,
      tables: 1,
      selectedMovement: null,
      ordinal: i,
    })),
  );
}

const MITCHELL: SelectedMovement = {
  source: "MITCHELL",
  mitchell: { tables: 6, rounds: 5, boardsPerRound: 3 },
};

describe("promoteTimerAtGameStart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateTimerState).mockResolvedValue(undefined);
    vi.mocked(createEngine).mockImplementation(async () => readyEngine());
    // A real (truthy) db handle; its methods are never called because the
    // section/movement reads are themselves mocked.
    vi.mocked(getDb).mockResolvedValue({} as never);
    // Default: no movement on a section (overridden per-test for the default path).
    vi.mocked(getSectionMovement).mockResolvedValue(null);
    vi.mocked(buildDefaultTimerConfigFor).mockResolvedValue(null);
  });

  it("promotes every configured section into a running, scheduled timer", async () => {
    sectionsAre("A", "B");
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

  it("creates and starts a default timer for a section with a movement but no saved config", async () => {
    sectionsAre("A");
    vi.mocked(findAllTimerStates).mockResolvedValue(new Map());
    vi.mocked(getSectionMovement).mockResolvedValue(MITCHELL);
    const defaultConfig: TimerConfig = {
      boardsPerRound: 3,
      totalRounds: 5,
      playDuration: 1350,
      moveDuration: 90,
      timingMode: "perBoard",
      warningSeconds: 60,
      breaks: [],
    };
    vi.mocked(buildDefaultTimerConfigFor).mockResolvedValue(defaultConfig);
    vi.mocked(createEngine).mockImplementation(async () =>
      readyEngine(defaultConfig),
    );

    await promoteTimerAtGameStart("g1", makeIo());

    // The synthesised default config is persisted (phase null) before promotion.
    expect(updateTimerState).toHaveBeenCalledWith(
      "g1",
      "A",
      expect.objectContaining({ phase: null, playDuration: 1350, moveDuration: 90 }),
    );
    // Then it is promoted (created + scheduled) just like a configured timer.
    expect(createEngine).toHaveBeenCalledWith(
      "g1",
      "A",
      3,
      5,
      1350,
      90,
      expect.anything(),
    );
    expect(scheduleGame).toHaveBeenCalledTimes(1);
  });

  it("leaves a section with no saved timer and no movement untouched", async () => {
    sectionsAre("A");
    vi.mocked(findAllTimerStates).mockResolvedValue(new Map());
    vi.mocked(getSectionMovement).mockResolvedValue(null);

    await promoteTimerAtGameStart("g1", makeIo());

    expect(createEngine).not.toHaveBeenCalled();
    expect(scheduleGame).not.toHaveBeenCalled();
  });

  it("mixes a configured section and a defaulted section", async () => {
    sectionsAre("A", "B");
    // A is configured; B has only a movement (gets a default).
    vi.mocked(findAllTimerStates).mockResolvedValue(
      new Map<string, TimerState>([["A", buildConfiguredTimerState(config)]]),
    );
    vi.mocked(getSectionMovement).mockImplementation(async (_db, section) =>
      section === "B" ? MITCHELL : null,
    );
    const defaultConfig: TimerConfig = {
      boardsPerRound: 2,
      totalRounds: 9,
      playDuration: 900,
      moveDuration: 90,
      timingMode: "perBoard",
      warningSeconds: 60,
      breaks: [],
    };
    vi.mocked(buildDefaultTimerConfigFor).mockResolvedValue(defaultConfig);

    await promoteTimerAtGameStart("g1", makeIo());

    // A promoted from its saved config, B from the synthesised default.
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
      2,
      9,
      900,
      90,
      expect.anything(),
    );
    expect(scheduleGame).toHaveBeenCalledTimes(2);
  });

  it("does not re-promote a section whose timer is already live", async () => {
    sectionsAre("A", "B");
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
    sectionsAre("A", "B");
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
