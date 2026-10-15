// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import { DEFAULT_TIMER_SETTINGS } from "@/timer/timer-state";

/**
 * End-to-end (real system DB) coverage of the default-timer settings round
 * trip: save the two editable durations, then read them back through the same
 * fallback-aware query the timer builder uses.
 */
describe("default timer settings (real system db)", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("system");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
    vi.clearAllMocks();
  });

  it("returns the built-in defaults when nothing has been saved", async () => {
    const { getDefaultTimerSettings } = await import(
      "@/db/system/queries/default-timer-settings"
    );

    expect(await getDefaultTimerSettings()).toEqual(DEFAULT_TIMER_SETTINGS);
  });

  it("round-trips saved durations and keeps the fixed mode/warning", async () => {
    const { saveDefaultTimerSettings } = await import(
      "@/db/system/actions/save-default-timer-settings"
    );
    const { getDefaultTimerSettings } = await import(
      "@/db/system/queries/default-timer-settings"
    );

    await saveDefaultTimerSettings(480, 120, 45);

    expect(await getDefaultTimerSettings()).toEqual({
      playSecondsPerBoard: 480,
      moveSeconds: 120,
      timingMode: DEFAULT_TIMER_SETTINGS.timingMode,
      warningSeconds: 45,
    });

    // Re-saving overwrites in place, and a 0 warning ("no warning") round-trips.
    await saveDefaultTimerSettings(300, 60, 0);
    const updated = await getDefaultTimerSettings();
    expect(updated.playSecondsPerBoard).toBe(300);
    expect(updated.moveSeconds).toBe(60);
    expect(updated.warningSeconds).toBe(0);
  });
});
