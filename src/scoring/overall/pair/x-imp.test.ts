import { describe, expect, it } from "vitest";
import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";
import { calculateOverallXIMPResults } from "./x-imp";

describe("calculateOverallXIMPResults", () => {
  // it("aggregates cross imps for all four players", () => {
  //   const travellers: ScoredTravellerOfType<"PAIR_XIMP">[] = [
  //     {
  //       type: "PAIR_XIMP",
  //       board: 1,
  //       lines: [
  //         {
  //           outcome: "1NTS=",
  //           score: 90,
  //
  //           nsId: "NS",
  //           ewId: "EW",
  //
  //           nsCrossImps: 5,
  //           ewCrossImps: -5,
  //         },
  //       ],
  //     },
  //   ];
  //
  //   const result = calculateOverallXIMPResults(travellers);
  //
  //   expect(result.type).toBe("PAIR_XIMP");
  //   expect(result.mode).toBe("PAIR");
  //   expect(result.scoring).toBe("XIMP");
  //
  //   expect(result.lines).toEqual([
  //     {
  //       rank: 1,
  //       playerId: "NS",
  //       crossImps: 5,
  //     },
  //     {
  //       rank: 2,
  //       playerId: "EW",
  //       crossImps: -5,
  //     },
  //   ]);
  // });

  it("sums cross imps across multiple boards", () => {
    const travellers: ScoredTravellerOfType<"PAIR_XIMP">[] = [
      {
        type: "PAIR_XIMP",
        board: 1,
        lines: [
          {
            outcome: "1NTS=",
            score: 90,

            nsId: "NS",
            ewId: "EW",

            nsCrossImps: 5,
            ewCrossImps: -5,
          },
        ],
      },
      {
        type: "PAIR_XIMP",
        board: 2,
        lines: [
          {
            outcome: "2HS=",
            score: 110,

            nsId: "NS",
            ewId: "EW",

            nsCrossImps: 3,
            ewCrossImps: -3,
          },
        ],
      },
    ];

    const result = calculateOverallXIMPResults(travellers);

    const ns = result.lines.find((x) => x.pairId === "NS");
    const ew = result.lines.find((x) => x.pairId === "EW");

    expect(ns?.crossImps).toBe(8);
    expect(ew?.crossImps).toBe(-8);
  });

  // it("ranks players by total cross imps", () => {
  //   const travellers: ScoredTravellerOfType<"PAIR_XIMP">[] = [
  //     {
  //       type: "PAIR_XIMP",
  //       board: 1,
  //       lines: [
  //         {
  //           outcome: "1NTS=",
  //           score: 90,
  //
  //           nsId: "A",
  //           ewId: "C",
  //
  //           nsCrossImps: 10,
  //           ewCrossImps: -10,
  //         },
  //       ],
  //     },
  //     {
  //       type: "PAIR_XIMP",
  //       board: 2,
  //       lines: [
  //         {
  //           outcome: "2HS=",
  //           score: 110,
  //
  //           nsId: "A",
  //           ewId: "E",
  //
  //           nsCrossImps: 5,
  //           ewCrossImps: -5,
  //         },
  //       ],
  //     },
  //   ];
  //
  //   const result = calculateOverallXIMPResults(travellers);
  //
  //   expect(result.lines[0]).toMatchObject({
  //     playerId: "A",
  //     crossImps: 15,
  //     rank: 1,
  //   });
  // });
  //
  // it("gives equal ranks for tied scores", () => {
  //   const travellers: ScoredTravellerOfType<"PAIR_XIMP">[] = [
  //     {
  //       type: "PAIR_XIMP",
  //       board: 1,
  //       lines: [
  //         {
  //           outcome: "1NTS=",
  //           score: 90,
  //
  //           nsId: "A",
  //           ewId: "C",
  //
  //           nsCrossImps: 5,
  //           ewCrossImps: -5,
  //         },
  //       ],
  //     },
  //     {
  //       type: "PAIR_XIMP",
  //       board: 2,
  //       lines: [
  //         {
  //           outcome: "1NTS=",
  //           score: 90,
  //
  //           nsId: "E",
  //           ewId: "G",
  //
  //           nsCrossImps: 5,
  //           ewCrossImps: -5,
  //         },
  //       ],
  //     },
  //   ];
  //
  //   const result = calculateOverallXIMPResults(travellers);
  //
  //   expect(result.lines.filter((x) => x.crossImps === 5)).toHaveLength(4);
  //
  //   expect(
  //     result.lines.filter((x) => x.crossImps === 5).every((x) => x.rank === 1),
  //   ).toBe(true);
  // });
  //
  // it("returns an empty leaderboard when there are no travellers", () => {
  //   const result = calculateOverallXIMPResults([]);
  //
  //   expect(result).toEqual({
  //     type: "PAIR_XIMP",
  //     mode: "PAIR",
  //     scoring: "XIMP",
  //     lines: [],
  //   });
  // });
});
