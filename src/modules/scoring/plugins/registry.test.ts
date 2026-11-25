import { describe, it, expect } from "vitest";
import {
  getCombination,
  getOverallPlugin,
  getPerBoardPlugin,
} from "./registry";
import { ScoringType } from "@/model/game-types";
import type { OverallPluginId, PerBoardPluginId } from "./types";

describe("combination registry", () => {
  it("maps each ScoringType to its per-board and overall plugin ids", () => {
    expect(getCombination("MP")).toEqual({ perBoard: "MP", overall: "MP" });
    expect(getCombination("XIMP")).toEqual({
      perBoard: "XIMP",
      overall: "XIMP",
    });
    // Teams scorings declare only a per-board plugin; their standings come from
    // the dedicated teams scorers, so no pairs `overall` plugin is set.
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
  it("returns every per-board plugin without any registration step", () => {
    expect(getPerBoardPlugin("MP").id).toBe("MP");
    expect(getPerBoardPlugin("IMP").id).toBe("IMP");
    expect(getPerBoardPlugin("XIMP").id).toBe("XIMP");
  });

  it("returns the MP and Cross-IMP overall plugins", () => {
    expect(getOverallPlugin("MP").id).toBe("MP");
    expect(getOverallPlugin("XIMP").id).toBe("XIMP");
  });

  it("throws for an unknown per-board plugin id", () => {
    expect(() => getPerBoardPlugin("BOGUS" as PerBoardPluginId)).toThrow(
      /No per-board scoring plugin for id "BOGUS"/,
    );
  });

  it("throws for an unknown overall plugin id (pairs has no IMP overall)", () => {
    expect(() => getOverallPlugin("IMP" as OverallPluginId)).toThrow(
      /No overall scoring plugin for id "IMP"/,
    );
  });
});
