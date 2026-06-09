import { describe, expect, it } from "vitest";
import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";
import { calculateOverallXIMPResults } from "./x-imp";

describe("calculateOverallXIMPResults", () => {
  // it("aggregates cross imps for all four players", () => {
  //   const travellers: ScoredTravellerOfType<"INDIVIDUAL_XIMP">[] = [
  //     {
  //       type: "INDIVIDUAL_XIMP",
  //       board: 1,
  //       lines: [
  //         {
  //           outcome: "1NTS=",
  //           score: 90,
  //
  //           nId: "N",
  //           sId: "S",
  //           eId: "E",
  //           wId: "W",
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
  //   expect(result.type).toBe("INDIVIDUAL_XIMP");
  //   expect(result.mode).toBe("INDIVIDUAL");
  //   expect(result.scoring).toBe("XIMP");
  //
  //   expect(result.lines).toEqual([
  //     {
  //       rank: 1,
  //       playerId: "N",
  //       crossImps: 5,
  //     },
  //     {
  //       rank: 1,
  //       playerId: "S",
  //       crossImps: 5,
  //     },
  //     {
  //       rank: 3,
  //       playerId: "E",
  //       crossImps: -5,
  //     },
  //     {
  //       rank: 3,
  //       playerId: "W",
  //       crossImps: -5,
  //     },
  //   ]);
  // });

  it("sums cross imps across multiple boards", () => {
    const travellers: ScoredTravellerOfType<"INDIVIDUAL_XIMP">[] = [
      {
        type: "INDIVIDUAL_XIMP",
        board: 1,
        lines: [
          {
            outcome: "1NTS=",
            score: 90,

            nId: "N",
            sId: "S",
            eId: "E",
            wId: "W",

            nsCrossImps: 5,
            ewCrossImps: -5,
          },
        ],
      },
      {
        type: "INDIVIDUAL_XIMP",
        board: 2,
        lines: [
          {
            outcome: "2HS=",
            score: 110,

            nId: "N",
            sId: "S",
            eId: "E",
            wId: "W",

            nsCrossImps: 3,
            ewCrossImps: -3,
          },
        ],
      },
    ];

    const result = calculateOverallXIMPResults(travellers);

    const north = result.lines.find((x) => x.playerId === "N");
    const south = result.lines.find((x) => x.playerId === "S");
    const east = result.lines.find((x) => x.playerId === "E");
    const west = result.lines.find((x) => x.playerId === "W");

    expect(north?.crossImps).toBe(8);
    expect(south?.crossImps).toBe(8);
    expect(east?.crossImps).toBe(-8);
    expect(west?.crossImps).toBe(-8);
  });

  it("ranks players by total cross imps", () => {
    const travellers: ScoredTravellerOfType<"INDIVIDUAL_XIMP">[] = [
      {
        type: "INDIVIDUAL_XIMP",
        board: 1,
        lines: [
          {
            outcome: "1NTS=",
            score: 90,

            nId: "A",
            sId: "B",
            eId: "C",
            wId: "D",

            nsCrossImps: 10,
            ewCrossImps: -10,
          },
        ],
      },
      {
        type: "INDIVIDUAL_XIMP",
        board: 2,
        lines: [
          {
            outcome: "2HS=",
            score: 110,

            nId: "A",
            sId: "B",
            eId: "E",
            wId: "F",

            nsCrossImps: 5,
            ewCrossImps: -5,
          },
        ],
      },
    ];

    const result = calculateOverallXIMPResults(travellers);

    expect(result.lines[0]).toMatchObject({
      playerId: "A",
      crossImps: 15,
      rank: 1,
    });

    expect(result.lines[1]).toMatchObject({
      playerId: "B",
      crossImps: 15,
      rank: 1,
    });
  });

  it("gives equal ranks for tied scores", () => {
    const travellers: ScoredTravellerOfType<"INDIVIDUAL_XIMP">[] = [
      {
        type: "INDIVIDUAL_XIMP",
        board: 1,
        lines: [
          {
            outcome: "1NTS=",
            score: 90,

            nId: "A",
            sId: "B",
            eId: "C",
            wId: "D",

            nsCrossImps: 5,
            ewCrossImps: -5,
          },
        ],
      },
      {
        type: "INDIVIDUAL_XIMP",
        board: 2,
        lines: [
          {
            outcome: "1NTS=",
            score: 90,

            nId: "E",
            sId: "F",
            eId: "G",
            wId: "H",

            nsCrossImps: 5,
            ewCrossImps: -5,
          },
        ],
      },
    ];

    const result = calculateOverallXIMPResults(travellers);

    expect(result.lines.filter((x) => x.crossImps === 5)).toHaveLength(4);

    expect(
      result.lines.filter((x) => x.crossImps === 5).every((x) => x.rank === 1),
    ).toBe(true);
  });

  it("returns an empty leaderboard when there are no travellers", () => {
    const result = calculateOverallXIMPResults([]);

    expect(result).toEqual({
      type: "INDIVIDUAL_XIMP",
      mode: "INDIVIDUAL",
      scoring: "XIMP",
      lines: [],
    });
  });
});
