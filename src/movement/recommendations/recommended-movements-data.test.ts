import { describe, it, expect } from "vitest";
import { RECOMMENDED_MOVEMENTS } from "./recommended-movements-data";
import { MovementFamily } from "./recommendation-types";

const VALID_FAMILIES: MovementFamily[] = [
  "MITCHELL",
  "SKIP_MITCHELL",
  "SHARE_AND_RELAY",
  "HOWELL",
  "ROVER",
  "APPENDIX",
  "WEB",
  "AMERICAN_WHIST",
];

describe("RECOMMENDED_MOVEMENTS", () => {
  const tableCounts = Object.keys(RECOMMENDED_MOVEMENTS).map(Number);

  it("covers integer table counts 2 through 20", () => {
    for (let t = 2; t <= 20; t++) {
      expect(RECOMMENDED_MOVEMENTS[t], `tables=${t}`).toBeDefined();
    }
  });

  it.each(tableCounts)("has at least one entry for %i tables", (tables) => {
    expect(RECOMMENDED_MOVEMENTS[tables].length).toBeGreaterThan(0);
  });

  it.each(tableCounts)("every entry for %i tables is valid", (tables) => {
    for (const entry of RECOMMENDED_MOVEMENTS[tables]) {
      expect(VALID_FAMILIES).toContain(entry.family);
      expect(entry.pros.length).toBeGreaterThan(0);
      expect(entry.cons.length).toBeGreaterThan(0);
      expect(entry.pros.every((p) => p.trim().length > 0)).toBe(true);
      expect(entry.cons.every((c) => c.trim().length > 0)).toBe(true);
      expect(entry.preference).toBeGreaterThan(0);
    }
  });

  it.each(tableCounts)(
    "preferences are unique within %i tables",
    (tables) => {
      const prefs = RECOMMENDED_MOVEMENTS[tables].map((e) => e.preference);
      expect(new Set(prefs).size).toBe(prefs.length);
    },
  );
});
