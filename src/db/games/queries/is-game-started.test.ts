import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));

import { getDb } from "@/db/games";
import { isGameStarted } from "./is-game-started";

/**
 * Build a stub db whose `select().from().limit()` resolves to `rows`.
 */
function stubDb(rows: unknown[]) {
  return {
    select: () => ({
      from: () => ({
        limit: () => Promise.resolve(rows),
      }),
    }),
  };
}

describe("isGameStarted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);
    await expect(isGameStarted("g1")).resolves.toBe(false);
  });

  it("returns false when no boards have been materialized", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]) as never);
    await expect(isGameStarted("g1")).resolves.toBe(false);
  });

  it("returns true once at least one board exists", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([{ n: 1 }]) as never);
    await expect(isGameStarted("g1")).resolves.toBe(true);
  });
});
