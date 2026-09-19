import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/db/games/queries/get-results-summary", () => ({
  getResultsSummary: vi.fn(),
}));

import { getDb } from "@/db/games";
import { getResultsSummary } from "@/db/games/queries/get-results-summary";
import { isGameCompleted } from "./is-game-completed";

describe("isGameCompleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when the per-game database does not exist yet", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);

    await expect(isGameCompleted("g1")).resolves.toBe(false);
    expect(getResultsSummary).not.toHaveBeenCalled();
  });

  it("is completed when every playable board has a final result", async () => {
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(getResultsSummary).mockResolvedValue({
      totalPlayable: 4,
      finalized: 4,
      allResultsIn: true,
    });

    await expect(isGameCompleted("g1")).resolves.toBe(true);
  });

  it("is not completed while some boards still lack a result", async () => {
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(getResultsSummary).mockResolvedValue({
      totalPlayable: 4,
      finalized: 2,
      allResultsIn: false,
    });

    await expect(isGameCompleted("g1")).resolves.toBe(false);
  });
});
