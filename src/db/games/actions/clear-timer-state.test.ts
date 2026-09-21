import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => {
  const getDb = vi.fn();
  return {
    getDb,
    requireGameDb: vi.fn(async (gameId: string) => {
      const db = await getDb(gameId);
      if (!db) throw new Error("Game db does not exist");
      return db;
    }),
  };
});

import { getDb } from "@/db/games";
import { clearTimerState } from "./clear-timer-state";

describe("clearTimerState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);
    await expect(clearTimerState("g1", "A")).rejects.toThrow(
      "Game db does not exist",
    );
  });

  it("deletes the section's timer metadata row", async () => {
    const where = vi.fn(() => Promise.resolve());
    const del = vi.fn(() => ({ where }));
    vi.mocked(getDb).mockResolvedValue({ delete: del } as never);

    await clearTimerState("g1", "A");

    expect(del).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
  });
});
