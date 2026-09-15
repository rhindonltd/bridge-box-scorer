import { describe, expect, it } from "vitest";
import { calculateWbfVP } from "./wbf-vp";

describe("calculateWbfVP", () => {
  it("awards a partial-win VP on the continuous scale (16 boards, 15 IMPs)", () => {
    expect(calculateWbfVP(16, 15, "continuous")).toEqual({
      winnerVP: 13.97,
      loserVP: 6.03,
    });
  });

  it("rounds the same match to whole VPs on the discrete scale", () => {
    expect(calculateWbfVP(16, 15, "discrete")).toEqual({
      winnerVP: 14,
      loserVP: 6,
    });
  });

  it("caps at 20/0 once the blitz margin is reached", () => {
    // Blitz point for 12 boards is 15 * sqrt(12) ≈ 51.96, so a 52-IMP margin
    // is at/above the cap and awards the full 20 VP.
    expect(calculateWbfVP(12, 52, "continuous")).toEqual({
      winnerVP: 20,
      loserVP: 0,
    });
  });

  it("splits 10/10 on a tied match", () => {
    expect(calculateWbfVP(16, 0, "continuous")).toEqual({
      winnerVP: 10,
      loserVP: 10,
    });
  });

  it("ignores the sign of the margin (winner's magnitude only)", () => {
    expect(calculateWbfVP(16, -15, "continuous")).toEqual(
      calculateWbfVP(16, 15, "continuous"),
    );
  });

  it("always splits a pool of exactly 20 VP", () => {
    for (const margin of [1, 5, 8, 13, 21, 30]) {
      const { winnerVP, loserVP } = calculateWbfVP(12, margin, "continuous");
      expect(Math.round((winnerVP + loserVP) * 100) / 100).toBe(20);
    }
  });
});
