import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games/queries/find-timer-state", () => ({
  findTimerState: vi.fn(),
}));

vi.mock("@/db/games/actions/update-timer-state", () => ({
  updateTimerState: vi.fn(),
}));

import { findTimerState } from "@/db/games/queries/find-timer-state";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { createEngine, getEngine, getAllEngines } from "./game-store";
import type { TimerState } from "./timer-state";

describe("game-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEngine", () => {
    it("creates a new engine with correct initial state", async () => {
      vi.mocked(updateTimerState).mockResolvedValue(undefined);

      const engine = await createEngine("game-1", 3, 5, 420, 60);

      expect(engine).toBeDefined();
      expect(engine.getState()).toMatchObject({
        version: 1,
        phase: "play",
        board: 1,
        round: 1,
        boardsPerRound: 3,
        totalRounds: 5,
        playDuration: 420,
        moveDuration: 60,
        isRunning: false,
      });
    });

    it("persists the timer state to the database", async () => {
      vi.mocked(updateTimerState).mockResolvedValue(undefined);

      await createEngine("game-2", 2, 4, 300, 45);

      expect(updateTimerState).toHaveBeenCalledWith(
        "game-2",
        expect.objectContaining({
          version: 1,
          phase: "play",
          boardsPerRound: 2,
          totalRounds: 4,
          playDuration: 300,
          moveDuration: 45,
        }),
      );
    });

    it("caches the engine so getEngine returns it", async () => {
      vi.mocked(updateTimerState).mockResolvedValue(undefined);

      const created = await createEngine("cached-1", 3, 5, 420, 60);
      const fetched = await getEngine("cached-1");

      expect(fetched).toBe(created);
      expect(findTimerState).not.toHaveBeenCalled();
    });
  });

  describe("getEngine", () => {
    it("returns null if no engine exists in cache and DB returns null", async () => {
      vi.mocked(findTimerState).mockResolvedValue(null);

      const engine = await getEngine("nonexistent");

      expect(engine).toBeNull();
    });

    it("creates engine from DB state if not in cache", async () => {
      const dbState: TimerState = {
        version: 1,
        phase: "move",
        board: 1,
        round: 2,
        boardsPerRound: 3,
        totalRounds: 5,
        playDuration: 420,
        moveDuration: 60,
        isRunning: false,
        phaseStartedAt: null,
        remainingMs: 30000,
      };

      vi.mocked(findTimerState).mockResolvedValue(dbState);

      const engine = await getEngine("db-game");

      expect(engine).not.toBeNull();
      expect(engine!.getState()).toMatchObject({
        phase: "move",
        round: 2,
        isRunning: false,
      });
    });
  });

  describe("getAllEngines", () => {
    it("returns the map of all created engines", async () => {
      vi.mocked(updateTimerState).mockResolvedValue(undefined);

      await createEngine("all-engines-1", 3, 5, 420, 60);

      const allEngines = getAllEngines();

      expect(allEngines).toBeInstanceOf(Map);
      expect(allEngines.has("all-engines-1")).toBe(true);
    });
  });
});
