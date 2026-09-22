import { describe, it, expect } from "vitest";
import {
  getCombination,
  getOverallPlugin,
  getPerBoardPlugin,
} from "./registry";
import { ScoringType } from "@/db/games/types/scoring-type";

describe("combination registry", () => {
  it("maps each ScoringType to its per-board and overall plugin ids", () => {
    expect(getCombination("MP")).toEqual({ perBoard: "MP", overall: "MP" });
    expect(getCombination("XIMP")).toEqual({
      perBoard: "XIMP",
      overall: "XIMP",
    });
    // Teams scorings declare only a per-board plugin; their standings are shown
    // via the team overall registry, so no pairs `overall` plugin is set.
    expect(getCombination("IMP")).toEqual({ perBoard: "IMP" });
    expect(getCombination("IMP_VP")).toEqual({ perBoard: "IMP" });
    expect(getCombination("BAM")).toEqual({ perBoard: "IMP" });
    expect(getCombination("PAB")).toEqual({ perBoard: "IMP" });
  });

  it("throws for an unknown scoring type", () => {
    expect(() => getCombination("BOGUS" as ScoringType)).toThrow(
      /No scoring combination registered/,
    );
  });
});

describe("plugin lookups", () => {
  it("throws when a per-board plugin id is not registered", () => {
    // No plugins are registered in this isolated test module.
    expect(() => getPerBoardPlugin("MP")).toThrow(
      /No per-board scoring plugin registered/,
    );
  });

  it("throws when an overall plugin id is not registered", () => {
    expect(() => getOverallPlugin("MP")).toThrow(
      /No overall scoring plugin registered/,
    );
  });
});
