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
  it("returns the score unchanged when the excluded ids match no line", () => {
    const score = mpScore([{ pairId: "A1NS", totalMP: 18, maxMP: 24 }]);
    expect(applyRankingExclusion(score, new Set(["ZZ"]))).toBe(score);
  });

  it("ranks an MP line with a zero maxMP at the 50% it is shown at", () => {
    const score = mpScore([
      { pairId: "A1NS", totalMP: 0, maxMP: 0 },
      { pairId: "A2NS", totalMP: 10, maxMP: 24 },
      { pairId: "A3NS", totalMP: 5, maxMP: 24 },
      { pairId: "A4NS", totalMP: 18, maxMP: 24 },
    ]);
    const result = applyRankingExclusion(
      score,
      new Set(["A3NS"]),
    ) as PairMatchpointOverallScore;
    // A4NS 75% > A1NS (no boards, 50%) > A2NS 41.7%.
    expect(result.lines.map((l) => l.pairId)).toEqual(["A4NS", "A1NS", "A2NS"]);
  });

  // Each variant is re-ranked on its own value, highest first.
  const variants: [string, Record<string, unknown>, Record<string, unknown>][] =
    [
      ["crossImps", { crossImps: 1 }, { crossImps: 5 }],
      ["imps", { imps: 1 }, { imps: 5 }],
      ["totalVP", { totalVP: 1 }, { totalVP: 5 }],
      ["totalImps", { totalImps: 1 }, { totalImps: 5 }],
      ["totalWon", { totalWon: 1 }, { totalWon: 5 }],
    ];
  it.each(variants)("re-ranks on %s", (_name, low, high) => {
    const score = {
      lines: [
        { pairId: "X", ...low, rank: 1, tied: false },
        { pairId: "Y", ...high, rank: 2, tied: false },
        { pairId: "Z", ...high, rank: 3, tied: false },
      ],
    } as any;
    const result = applyRankingExclusion(score, new Set(["Z"])) as any;
    expect(result.lines.map((l: any) => l.pairId)).toEqual(["Y", "X"]);
  });

  it("falls back to 0 for a line with no recognised value", () => {
    const score = {
      lines: [
        { pairId: "X", rank: 1, tied: false },
        { pairId: "Y", rank: 2, tied: false },
      ],
    } as any;
    const result = applyRankingExclusion(score, new Set(["Y"])) as any;
    expect(result.lines.map((l: any) => l.pairId)).toEqual(["X"]);
  });

  it("treats a line with neither pairId nor teamId as never excluded", () => {
    const score = {
      lines: [
        { totalVP: 1, rank: 1, tied: false },
        { teamId: "T", totalVP: 0, rank: 2, tied: false },
      ],
    } as any;
    const result = applyRankingExclusion(score, new Set(["T"])) as any;
    expect(result.lines).toHaveLength(1);
  });
});
