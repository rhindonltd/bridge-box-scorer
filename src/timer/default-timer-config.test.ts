import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/movement-rehydration", () => ({
  rehydrateSelectedMovement: vi.fn(),
}));

vi.mock("@/db/system/queries/default-timer-settings", () => ({
  getDefaultTimerSettings: vi.fn(),
}));

import { rehydrateSelectedMovement } from "@/services/movement-rehydration";
import { getDefaultTimerSettings } from "@/db/system/queries/default-timer-settings";
import { DEFAULT_TIMER_SETTINGS } from "@/timer/timer-state";
import type { SelectedMovement } from "@/model/selected-movement";
import {
  buildDefaultTimerConfig,
  buildDefaultTimerConfigFor,
  deriveMovementRoundInfo,
} from "./default-timer-config";

describe("deriveMovementRoundInfo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads boards/rounds inline for a MITCHELL selection (no rehydration)", async () => {
    const m: SelectedMovement = {
      source: "MITCHELL",
      mitchell: { tables: 6, rounds: 9, boardsPerRound: 2 },
    };

    expect(await deriveMovementRoundInfo(m)).toEqual({
      boardsPerRound: 2,
      totalRounds: 9,
    });
    expect(rehydrateSelectedMovement).not.toHaveBeenCalled();
  });

  it("reads boards/rounds inline for a SWISS selection", async () => {
    const m: SelectedMovement = {
      source: "SWISS",
      swiss: { tables: 7, rounds: 7, boardsPerRound: 3 },
    };

    expect(await deriveMovementRoundInfo(m)).toEqual({
      boardsPerRound: 3,
      totalRounds: 7,
    });
    expect(rehydrateSelectedMovement).not.toHaveBeenCalled();
  });

  it("derives the round count from the rehydrated movement for a SPEC selection", async () => {
    const m: SelectedMovement = {
      source: "SPEC",
      specId: 42,
      boardsPerRound: 2,
    };
    // First table has 10 rounds; every table plays the same count.
    vi.mocked(rehydrateSelectedMovement).mockResolvedValue({
      movement: [
        { tableNumber: 1, rounds: Array.from({ length: 10 }, () => ({})) },
      ],
    } as never);

    expect(await deriveMovementRoundInfo(m)).toEqual({
      boardsPerRound: 2,
      totalRounds: 10,
    });
    expect(rehydrateSelectedMovement).toHaveBeenCalledWith(m);
  });

  it("returns null for a SPEC whose rehydration yields no tables", async () => {
    const m: SelectedMovement = {
      source: "SPEC",
      specId: 1,
      boardsPerRound: 2,
    };
    vi.mocked(rehydrateSelectedMovement).mockResolvedValue({
      movement: [],
    } as never);

    expect(await deriveMovementRoundInfo(m)).toBeNull();
  });
});

describe("buildDefaultTimerConfig", () => {
  it("applies the shared defaults, scaling play per board", () => {
    const config = buildDefaultTimerConfig({
      boardsPerRound: 3,
      totalRounds: 8,
    });

    expect(config).toEqual({
      boardsPerRound: 3,
      totalRounds: 8,
      // 7:30 per board * 3 boards = 1350s.
      playDuration: DEFAULT_TIMER_SETTINGS.playSecondsPerBoard * 3,
      moveDuration: DEFAULT_TIMER_SETTINGS.moveSeconds,
      timingMode: DEFAULT_TIMER_SETTINGS.timingMode,
      warningSeconds: DEFAULT_TIMER_SETTINGS.warningSeconds,
      breaks: [],
    });
    expect(config.playDuration).toBe(1350);
  });
});

describe("buildDefaultTimerConfigFor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: the stored global settings resolve to the built-in defaults.
    vi.mocked(getDefaultTimerSettings).mockResolvedValue(DEFAULT_TIMER_SETTINGS);
  });

  it("stamps requiresDrawBetweenRounds true for a Swiss movement", async () => {
    const m: SelectedMovement = {
      source: "SWISS",
      swiss: { tables: 6, rounds: 7, boardsPerRound: 2 },
    };

    const config = await buildDefaultTimerConfigFor(m);

    expect(config).toMatchObject({
      boardsPerRound: 2,
      totalRounds: 7,
      playDuration: 900,
      moveDuration: 90,
      requiresDrawBetweenRounds: true,
    });
  });

  it("stamps requiresDrawBetweenRounds false for a Mitchell movement", async () => {
    const m: SelectedMovement = {
      source: "MITCHELL",
      mitchell: { tables: 6, rounds: 5, boardsPerRound: 3 },
    };

    const config = await buildDefaultTimerConfigFor(m);

    expect(config?.requiresDrawBetweenRounds).toBe(false);
    expect(config?.playDuration).toBe(1350);
  });

  it("uses the club-wide stored default timer settings when present", async () => {
    // A director has set 8:00/board play and a 2:00 changeover in Settings.
    vi.mocked(getDefaultTimerSettings).mockResolvedValue({
      playSecondsPerBoard: 480,
      moveSeconds: 120,
      timingMode: "perBoard",
      warningSeconds: 60,
    });
    const m: SelectedMovement = {
      source: "MITCHELL",
      mitchell: { tables: 6, rounds: 5, boardsPerRound: 2 },
    };

    const config = await buildDefaultTimerConfigFor(m);

    // 8:00/board * 2 boards = 960s play; 2:00 changeover.
    expect(config?.playDuration).toBe(960);
    expect(config?.moveDuration).toBe(120);
  });

  it("returns null when the movement structure can't be derived", async () => {
    const m: SelectedMovement = {
      source: "SPEC",
      specId: 1,
      boardsPerRound: 2,
    };
    vi.mocked(rehydrateSelectedMovement).mockResolvedValue({
      movement: [],
    } as never);

    expect(await buildDefaultTimerConfigFor(m)).toBeNull();
  });
});
