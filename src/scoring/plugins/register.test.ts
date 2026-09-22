import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * The registry uses module-level maps populated as an import side effect. Reset
 * the module registry before each test so importing `./register` produces a
 * freshly-populated registry (and so lookups before import throw).
 */
beforeEach(() => {
  vi.resetModules();
});

describe("scoring plugin registration", () => {
  it("registers the per-board (and, for pairs, overall) plugins after importing register", async () => {
    await import("./register");
    const { getCombination, getPerBoardPlugin, getOverallPlugin } =
      await import("./registry");

    // Every scoring type resolves a per-board plugin (its traveller display).
    for (const scoringType of ["MP", "IMP", "XIMP", "BAM", "PAB"] as const) {
      const { perBoard } = getCombination(scoringType);
      const perBoardPlugin = getPerBoardPlugin(perBoard);
      expect(perBoardPlugin.id).toBe(perBoard);
      expect(perBoardPlugin.views.length).toBeGreaterThan(0);
      expect(typeof perBoardPlugin.score).toBe("function");
    }

    // The pairs board-pooled scorings (MP, Cross-IMP) also resolve an overall
    // plugin; teams scorings omit `overall` (shown via the team registry).
    for (const scoringType of ["MP", "XIMP"] as const) {
      const { overall } = getCombination(scoringType);
      expect(overall).toBeDefined();
      const overallPlugin = getOverallPlugin(overall!);
      expect(overallPlugin.id).toBe(overall);
      expect(overallPlugin.views.length).toBeGreaterThan(0);
      expect(typeof overallPlugin.aggregate).toBe("function");
    }
  });

  it("throws for a plugin id that was never registered (registry starts empty)", async () => {
    const { getPerBoardPlugin } = await import("./registry");
    expect(() => getPerBoardPlugin("MP")).toThrow(
      /No per-board scoring plugin registered/,
    );
  });
});
