// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import { buildConfiguredTimerState } from "@/timer/timer-state";
import type { Db } from "@/db/games";
import { sections } from "@/db/games/tables/sections";
import {
  serializeSelectedMovement,
  type SelectedMovement,
} from "@/model/selected-movement";

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

  /**
   * Insert section rows for the game. `promoteTimerAtGameStart` iterates the
   * game's sections (so it can also default-create timers for sections the
   * director never configured), so a section must exist for its timer to be
   * promoted. `movement` is the section's selected movement, if any.
   */
  async function createSections(
    entries: { section: string; movement?: SelectedMovement }[],
  ) {
    const db = (await harness.getDb()) as Db;
    db.insert(sections)
      .values(
        entries.map((e, i) => ({
          section: e.section,
          label: e.section,
          tables: 6,
          selectedMovement: e.movement
            ? serializeSelectedMovement(e.movement)
            : null,
          ordinal: i,
        })),
      )
      .run();
  }

  it("promotes each configured section into an independent running timer", async () => {
    await createSections([{ section: "A" }, { section: "B" }]);

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

    // Only section A exists (and only it has a config). B is absent entirely,
    // so there is nothing to default-create for it either.
    await createSections([{ section: "A" }]);
    await updateTimerState(
      harness.gameId,
      "A",
      buildConfiguredTimerState(config),
    );

    const { io } = makeIo();
    await promoteTimerAtGameStart(harness.gameId, io);

    expect((await findTimerState(harness.gameId, "A"))?.isRunning).toBe(true);
    // Section B never existed/was configured.
    expect(await findTimerState(harness.gameId, "B")).toBeNull();
  });

  it("default-creates and starts a timer for a section with a movement but no saved config", async () => {
    const { findTimerState } = await import(
      "@/db/games/queries/find-timer-state"
    );
    const { promoteTimerAtGameStart } = await import("@/timer/promote-timer");
    const { scheduleGame } = await import("@/timer/scheduler");

    // Section A has a movement selected but the director never opened the timer
    // page, so there is no saved timer config.
    await createSections([
      {
        section: "A",
        movement: {
          source: "MITCHELL",
          mitchell: { tables: 6, rounds: 5, boardsPerRound: 3 },
        },
      },
    ]);

    const { io } = makeIo();
    await promoteTimerAtGameStart(harness.gameId, io);

    const a = await findTimerState(harness.gameId, "A");
    expect(a?.phase).toBe("play");
    expect(a?.isRunning).toBe(true);
    // Defaults from the timer page: 7:30/board over 3 boards = 1350s play, 90s
    // move, sized to the movement's 5 rounds.
    expect(a?.totalRounds).toBe(5);
    expect(a?.boardsPerRound).toBe(3);
    expect(a?.playDuration).toBe(1350);
    expect(a?.moveDuration).toBe(90);
    expect(scheduleGame).toHaveBeenCalledTimes(1);
  });

  it("leaves a section with no saved config and no movement without a timer", async () => {
    const { findTimerState } = await import(
      "@/db/games/queries/find-timer-state"
    );
    const { promoteTimerAtGameStart } = await import("@/timer/promote-timer");
    const { scheduleGame } = await import("@/timer/scheduler");

    // Section exists but has no movement chosen, so no default can be sized.
    await createSections([{ section: "A" }]);

    const { io } = makeIo();
    await promoteTimerAtGameStart(harness.gameId, io);

    expect(await findTimerState(harness.gameId, "A")).toBeNull();
    expect(scheduleGame).not.toHaveBeenCalled();
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

    await createSections([{ section: "A" }, { section: "B" }]);
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
