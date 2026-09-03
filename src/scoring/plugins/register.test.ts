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
  it("registers a per-board and overall plugin for every scoring type after importing register", async () => {
    await import("./register");
    const { getCombination, getPerBoardPlugin, getOverallPlugin } =
      await import("./registry");

    for (const scoringType of ["MP", "IMP", "XIMP"] as const) {
      const { perBoard, overall } = getCombination(scoringType);

      const perBoardPlugin = getPerBoardPlugin(perBoard);
      expect(perBoardPlugin.id).toBe(perBoard);
      expect(perBoardPlugin.views.length).toBeGreaterThan(0);
      expect(typeof perBoardPlugin.score).toBe("function");

      const overallPlugin = getOverallPlugin(overall);
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
