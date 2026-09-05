// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import { buildConfiguredTimerState } from "@/timer/timer-state";

// The scheduler uses real timers; stub it so the test doesn't leave a pending
// timeout, while still asserting it was asked to schedule the running timer.
vi.mock("@/timer/scheduler", () => ({
  scheduleGame: vi.fn(),
}));

/**
 * End-to-end (real per-game DB) coverage of the save-config -> game-start
 * promotion path: a configured timer persisted to the games metadata table is
 * promoted into a running timer when the game starts.
 */
describe("promoteTimerAtGameStart (real games db)", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
    vi.clearAllMocks();
  });

  function makeIo() {
    const emit = vi.fn();
    return { io: { to: vi.fn(() => ({ emit })) } as never, emit };
  }

  it("promotes a persisted configured timer into a running timer", async () => {
    // Persist a "configured but not started" timer, exactly as timer:saveConfig
    // would.
    const { updateTimerState } = await import(
      "@/db/games/actions/update-timer-state"
    );
    const { findTimerState } = await import(
      "@/db/games/queries/find-timer-state"
    );
    const { promoteTimerAtGameStart } = await import("@/timer/promote-timer");
    const { scheduleGame } = await import("@/timer/scheduler");

    const configured = buildConfiguredTimerState({
      boardsPerRound: 3,
      totalRounds: 6,
      playDuration: 420,
      moveDuration: 90,
      breaks: [
        { afterRound: 3, mode: "duration", durationSeconds: 600 },
      ],
      warningSeconds: 45,
    });
    await updateTimerState(harness.gameId, configured);

    // Sanity: it is stored as not-started.
    const before = await findTimerState(harness.gameId);
    expect(before?.phase).toBeNull();
    expect(before?.isRunning).toBe(false);

    const { io, emit } = makeIo();
    await promoteTimerAtGameStart(harness.gameId, io);

    // The persisted state is now a live, running timer preserving the config.
    const after = await findTimerState(harness.gameId);
    expect(after?.phase).toBe("play");
    expect(after?.isRunning).toBe(true);
    expect(after?.round).toBe(1);
    expect(after?.totalRounds).toBe(6);
    expect(after?.playDuration).toBe(420);
    expect(after?.moveDuration).toBe(90);
    expect(after?.warningSeconds).toBe(45);
    expect(after?.breaks).toEqual([
      { afterRound: 3, mode: "duration", durationSeconds: 600 },
    ]);

    expect(emit).toHaveBeenCalled();
    expect(scheduleGame).toHaveBeenCalledTimes(1);
  });

  it("does nothing when no timer was configured", async () => {
    const { findTimerState } = await import(
      "@/db/games/queries/find-timer-state"
    );
    const { promoteTimerAtGameStart } = await import("@/timer/promote-timer");
    const { scheduleGame } = await import("@/timer/scheduler");

    const { io, emit } = makeIo();
    await promoteTimerAtGameStart(harness.gameId, io);

    expect(await findTimerState(harness.gameId)).toBeNull();
    expect(emit).not.toHaveBeenCalled();
    expect(scheduleGame).not.toHaveBeenCalled();
  });

  it("does not re-promote a timer that is already running", async () => {
    const { updateTimerState } = await import(
      "@/db/games/actions/update-timer-state"
    );
    const { findTimerState } = await import(
      "@/db/games/queries/find-timer-state"
    );
    const { promoteTimerAtGameStart } = await import("@/timer/promote-timer");
    const { scheduleGame } = await import("@/timer/scheduler");

    const startedAt = Date.now() - 5000;
    await updateTimerState(harness.gameId, {
      ...buildConfiguredTimerState({
        boardsPerRound: 3,
        totalRounds: 6,
        playDuration: 420,
        moveDuration: 90,
      }),
      phase: "play",
      isRunning: true,
      phaseStartedAt: startedAt,
      remainingMs: null,
    });

    const { io } = makeIo();
    await promoteTimerAtGameStart(harness.gameId, io);

    // Unchanged: still the same running phase we set up.
    const after = await findTimerState(harness.gameId);
    expect(after?.phaseStartedAt).toBe(startedAt);
    expect(scheduleGame).not.toHaveBeenCalled();
  });
});
