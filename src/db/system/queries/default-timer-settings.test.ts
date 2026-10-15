import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/settings", () => ({
  findSetting: vi.fn(),
}));

import { findSetting } from "@/db/system/queries/settings";
import { DEFAULT_TIMER_SETTINGS } from "@/timer/timer-state";
import {
  TIMER_MOVE_SECONDS_KEY,
  TIMER_PLAY_SECONDS_PER_BOARD_KEY,
  TIMER_WARNING_SECONDS_KEY,
} from "@/db/system/actions/save-default-timer-settings";
import { getDefaultTimerSettings } from "./default-timer-settings";

/** Stub findSetting to return a value per key. */
function stubSettings(values: Record<string, string | null>) {
  vi.mocked(findSetting).mockImplementation(async (key: string) =>
    key in values ? values[key] : null,
  );
}

describe("getDefaultTimerSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("falls back entirely to the built-in defaults when nothing is stored", async () => {
    stubSettings({});

    expect(await getDefaultTimerSettings()).toEqual(DEFAULT_TIMER_SETTINGS);
  });

  it("returns the stored values when all are valid", async () => {
    stubSettings({
      [TIMER_PLAY_SECONDS_PER_BOARD_KEY]: "480",
      [TIMER_MOVE_SECONDS_KEY]: "120",
      [TIMER_WARNING_SECONDS_KEY]: "45",
    });

    expect(await getDefaultTimerSettings()).toEqual({
      playSecondsPerBoard: 480,
      moveSeconds: 120,
      timingMode: DEFAULT_TIMER_SETTINGS.timingMode,
      warningSeconds: 45,
    });
  });

  it("accepts a stored warning of 0 (no warning), which the durations reject", async () => {
    stubSettings({
      [TIMER_PLAY_SECONDS_PER_BOARD_KEY]: "450",
      [TIMER_MOVE_SECONDS_KEY]: "90",
      [TIMER_WARNING_SECONDS_KEY]: "0",
    });

    expect(await getDefaultTimerSettings()).toMatchObject({
      playSecondsPerBoard: 450,
      moveSeconds: 90,
      warningSeconds: 0,
    });
  });

  it("falls back per field when a stored value is missing, blank, non-numeric, or non-positive", async () => {
    for (const bad of [null, "", "abc", "0", "-5", "12.5"]) {
      stubSettings({
        [TIMER_PLAY_SECONDS_PER_BOARD_KEY]: bad,
        [TIMER_MOVE_SECONDS_KEY]: "120",
        [TIMER_WARNING_SECONDS_KEY]: "45",
      });

      const result = await getDefaultTimerSettings();
      expect(result.playSecondsPerBoard).toBe(
        DEFAULT_TIMER_SETTINGS.playSecondsPerBoard,
      );
      expect(result.moveSeconds).toBe(120);
      expect(result.warningSeconds).toBe(45);
    }
  });

  it("falls back the warning to the default when it is blank, non-numeric, or negative", async () => {
    for (const bad of [null, "", "abc", "-5", "12.5"]) {
      stubSettings({
        [TIMER_PLAY_SECONDS_PER_BOARD_KEY]: "450",
        [TIMER_MOVE_SECONDS_KEY]: "90",
        [TIMER_WARNING_SECONDS_KEY]: bad,
      });

      const result = await getDefaultTimerSettings();
      expect(result.warningSeconds).toBe(
        DEFAULT_TIMER_SETTINGS.warningSeconds,
      );
    }
  });
});
