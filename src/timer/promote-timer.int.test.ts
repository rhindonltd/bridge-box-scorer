// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import { buildConfiguredTimerState } from "@/timer/timer-state";

// The scheduler uses real timers; stub it so the test doesn't leave a pending
// timeout, while still asserting it was asked to schedule the running timers.
vi.mock("@/timer/scheduler", () => ({
  scheduleGame: vi.fn(),
}));

/**
 * End-to-end (real per-game DB) coverage of the save-config -> game-start
 * promotion path, now per section: each section's configured timer is promoted
 * into an independent running timer when the game starts.
 */
describe("promoteTimerAtGameStart (real games db, per section)", () => {
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

  const config = {
    boardsPerRound: 3,
    totalRounds: 6,
    playDuration: 420,
    moveDuration: 90,
  };

  it("promotes each configured section into an independent running timer", async () => {
    const { updateTimerState } = await import(
      "@/db/games/actions/update-timer-state"
    );
    const { findTimerState } = await import(
      "@/db/games/queries/find-timer-state"
    );
    const { promoteTimerAtGameStart } = await import("@/timer/promote-timer");
    const { scheduleGame } = await import("@/timer/scheduler");

    // Two sections configured with different totals.
    await updateTimerState(
      harness.gameId,
      "A",
      buildConfiguredTimerState({ ...config, totalRounds: 6 }),
    );
    await updateTimerState(
      harness.gameId,
      "B",
      buildConfiguredTimerState({ ...config, totalRounds: 9 }),
    );

    const { io } = makeIo();
    await promoteTimerAtGameStart(harness.gameId, io);

    const a = await findTimerState(harness.gameId, "A");
    const b = await findTimerState(harness.gameId, "B");

    expect(a?.phase).toBe("play");
    expect(a?.isRunning).toBe(true);
    expect(a?.totalRounds).toBe(6);

    expect(b?.phase).toBe("play");
    expect(b?.isRunning).toBe(true);
    expect(b?.totalRounds).toBe(9);

    // One scheduled timer per section.
    expect(scheduleGame).toHaveBeenCalledTimes(2);
  });

  it("promotes only the section that was configured", async () => {
    const { updateTimerState } = await import(
      "@/db/games/actions/update-timer-state"
    );
    const { findTimerState } = await import(
      "@/db/games/queries/find-timer-state"
    );
    const { promoteTimerAtGameStart } = await import("@/timer/promote-timer");

    await updateTimerState(
      harness.gameId,
      "A",
      buildConfiguredTimerState(config),
    );

    const { io } = makeIo();
    await promoteTimerAtGameStart(harness.gameId, io);

    expect((await findTimerState(harness.gameId, "A"))?.isRunning).toBe(true);
    // Section B never had a config.
    expect(await findTimerState(harness.gameId, "B")).toBeNull();
  });

  it("does nothing when no section was configured", async () => {
    const { promoteTimerAtGameStart } = await import("@/timer/promote-timer");
    const { scheduleGame } = await import("@/timer/scheduler");

    const { io, emit } = makeIo();
    await promoteTimerAtGameStart(harness.gameId, io);

    expect(emit).not.toHaveBeenCalled();
    expect(scheduleGame).not.toHaveBeenCalled();
  });

  it("does not re-promote a section that is already running", async () => {
    const { updateTimerState } = await import(
      "@/db/games/actions/update-timer-state"
    );
    const { findTimerState } = await import(
      "@/db/games/queries/find-timer-state"
    );
    const { promoteTimerAtGameStart } = await import("@/timer/promote-timer");

    const startedAt = Date.now() - 5000;
    // A is already live; B is a fresh config.
    await updateTimerState(harness.gameId, "A", {
      ...buildConfiguredTimerState(config),
      phase: "play",
      isRunning: true,
      phaseStartedAt: startedAt,
      remainingMs: null,
    });
    await updateTimerState(
      harness.gameId,
      "B",
      buildConfiguredTimerState(config),
    );

    const { io } = makeIo();
    await promoteTimerAtGameStart(harness.gameId, io);

    // A unchanged; B now running.
    expect((await findTimerState(harness.gameId, "A"))?.phaseStartedAt).toBe(
      startedAt,
    );
    expect((await findTimerState(harness.gameId, "B"))?.isRunning).toBe(true);
  });
});
