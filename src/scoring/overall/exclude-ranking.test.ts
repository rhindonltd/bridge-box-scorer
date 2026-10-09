import { describe, it, expect } from "vitest";
import { applyRankingExclusion } from "./exclude-ranking";
import type {
  PairMatchpointOverallScore,
  TeamSwissVpOverallScore,
} from "@/model/leaderboard";

/** A ranked MP pairs overall score with the given pair lines (pre-ranked). */
function mpScore(
  lines: { pairId: string; totalMP: number; maxMP: number }[],
): PairMatchpointOverallScore {
  return {
    type: "PAIR_MP",
    mode: "PAIR",
    scoring: "MP",
    // rank/tied are recomputed by the helper; seed them arbitrarily.
    lines: lines.map((l, i) => ({ ...l, rank: i + 1, tied: false })),
  };
}

describe("applyRankingExclusion", () => {
  it("is a no-op when nothing is excluded", () => {
    const score = mpScore([
      { pairId: "A1NS", totalMP: 18, maxMP: 24 },
      { pairId: "A2NS", totalMP: 12, maxMP: 24 },
    ]);
    expect(applyRankingExclusion(score, new Set())).toBe(score);
  });

  it("drops an excluded pair and re-ranks the survivors contiguously", () => {
    // A2NS sits 2nd on percentage; excluding it should leave A1NS 1st and
    // A3NS 2nd (not 3rd), i.e. places are renumbered.
    const score = mpScore([
      { pairId: "A1NS", totalMP: 20, maxMP: 24 }, // 83%
      { pairId: "A2NS", totalMP: 14, maxMP: 24 }, // 58% (excluded)
      { pairId: "A3NS", totalMP: 10, maxMP: 24 }, // 42%
    ]);

    const result = applyRankingExclusion(
      score,
      new Set(["A2NS"]),
    ) as PairMatchpointOverallScore;

    expect(result.lines.map((l) => l.pairId)).toEqual(["A1NS", "A3NS"]);
    expect(result.lines.map((l) => l.rank)).toEqual([1, 2]);
    // The surviving pairs keep their own values untouched.
    expect(result.lines[0].totalMP).toBe(20);
    expect(result.lines[1].totalMP).toBe(10);
  });

  it("preserves ranking order (only renumbers places)", () => {
    const score = mpScore([
      { pairId: "A1NS", totalMP: 10, maxMP: 24 },
      { pairId: "A2NS", totalMP: 22, maxMP: 24 }, // top, excluded
      { pairId: "A3NS", totalMP: 16, maxMP: 24 },
    ]);

    const result = applyRankingExclusion(
      score,
      new Set(["A2NS"]),
    ) as PairMatchpointOverallScore;
    // Order among survivors is by percentage: A3NS (67%) then A1NS (42%).
    expect(result.lines.map((l) => l.pairId)).toEqual(["A3NS", "A1NS"]);
  });

  it("excludes a team line by teamId on a teams VP score", () => {
    const score: TeamSwissVpOverallScore = {
      type: "TEAM_SWISS_VP",
      mode: "TEAM",
      scoring: "SWISS_VP",
      lines: [
        { teamId: "A1NS", totalVP: 55, vpByRound: {}, rank: 1, tied: false },
        { teamId: "A2NS", totalVP: 40, vpByRound: {}, rank: 2, tied: false },
      ],
    };

    const result = applyRankingExclusion(
      score,
      new Set(["A1NS"]),
    ) as TeamSwissVpOverallScore;
    expect(result.lines.map((l) => l.teamId)).toEqual(["A2NS"]);
    expect(result.lines[0].rank).toBe(1);
  });
});
