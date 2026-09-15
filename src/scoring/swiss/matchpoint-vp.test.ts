import { describe, expect, it } from "vitest";
import { calculateIndependentMpVP } from "./matchpoint-vp";

describe("calculateIndependentMpVP", () => {
  it("awards 10 VP for a dead-average 50%", () => {
    expect(calculateIndependentMpVP(50)).toEqual({
      pairPercentage: 50,
      vpAwarded: 10,
    });
  });

  it("uses the competitive segment at 55%", () => {
    expect(calculateIndependentMpVP(55)).toEqual({
      pairPercentage: 55,
      vpAwarded: 13.33,
    });
  });

  it("uses the high-performance segment at 62.5%", () => {
    expect(calculateIndependentMpVP(62.5)).toEqual({
      pairPercentage: 62.5,
      vpAwarded: 17,
    });
  });

  it("caps at 20 VP once the blowout threshold is reached", () => {
    expect(calculateIndependentMpVP(72.1)).toEqual({
      pairPercentage: 72.1,
      vpAwarded: 20,
    });
  });

  it("floors at 0 VP for a very low percentage", () => {
    expect(calculateIndependentMpVP(25)).toEqual({
      pairPercentage: 25,
      vpAwarded: 0,
    });
  });

  it("scores each pair independently — a table need not sum to 20", () => {
    // The material's example: 15% -> 0 VP, opponents' 50% -> 10 VP; the table
    // totals 10 VP, not 20, because each pair is measured against the field.
    expect(calculateIndependentMpVP(15).vpAwarded).toBe(0);
    expect(calculateIndependentMpVP(50).vpAwarded).toBe(10);
  });

  it("rejects out-of-range percentages", () => {
    expect(() => calculateIndependentMpVP(-1)).toThrow();
    expect(() => calculateIndependentMpVP(101)).toThrow();
  });
});
