import { describe, expect, it } from "vitest";

import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";
import { calculateOverallMPResults } from "./mp";

describe("calculateOverallMPResults", () => {
  it("returns correct metadata", () => {
    const travellers: ScoredTravellerOfType<"INDIVIDUAL_MP">[] = [];

    const result = calculateOverallMPResults(travellers);

    expect(result.type).toBe("INDIVIDUAL_MP");
    expect(result.mode).toBe("INDIVIDUAL");
    expect(result.scoring).toBe("MP");
  });

  it("awards NS matchpoints to north and south", () => {
    const travellers: ScoredTravellerOfType<"INDIVIDUAL_MP">[] = [
      {
        type: "INDIVIDUAL_MP",
        board: 1,
        lines: [
          {
            outcome: "PO",
            score: 0,
            nId: "N",
            sId: "S",
            eId: "E",
            wId: "W",
            nsMatchPoints: 8,
            ewMatchPoints: 2,
            maxMatchPoints: 10,
          },
        ],
      },
    ];

    const result = calculateOverallMPResults(travellers);

    const north = result.lines.find((x) => x.playerId === "N");
    const south = result.lines.find((x) => x.playerId === "S");

    expect(north?.totalMP).toBe(8);
    expect(south?.totalMP).toBe(8);
  });

  it("awards EW matchpoints to east and west", () => {
    const travellers: ScoredTravellerOfType<"INDIVIDUAL_MP">[] = [
      {
        type: "INDIVIDUAL_MP",
        board: 1,
        lines: [
          {
            outcome: "PO",
            score: 0,
            nId: "N",
            sId: "S",
            eId: "E",
            wId: "W",
            nsMatchPoints: 8,
            ewMatchPoints: 2,
            maxMatchPoints: 10,
          },
        ],
      },
    ];

    const result = calculateOverallMPResults(travellers);

    const east = result.lines.find((x) => x.playerId === "E");
    const west = result.lines.find((x) => x.playerId === "W");

    expect(east?.totalMP).toBe(2);
    expect(west?.totalMP).toBe(2);
  });

  it("aggregates scores across multiple boards", () => {
    const travellers: ScoredTravellerOfType<"INDIVIDUAL_MP">[] = [
      {
        type: "INDIVIDUAL_MP",
        board: 1,
        lines: [
          {
            outcome: "PO",
            score: 0,
            nId: "N",
            sId: "S",
            eId: "E",
            wId: "W",
            nsMatchPoints: 8,
            ewMatchPoints: 2,
            maxMatchPoints: 10,
          },
        ],
      },
      {
        type: "INDIVIDUAL_MP",
        board: 2,
        lines: [
          {
            outcome: "PO",
            score: 0,
            nId: "N",
            sId: "S",
            eId: "E",
            wId: "W",
            nsMatchPoints: 6,
            ewMatchPoints: 4,
            maxMatchPoints: 10,
          },
        ],
      },
    ];

    const result = calculateOverallMPResults(travellers);

    const north = result.lines.find((x) => x.playerId === "N");
    const east = result.lines.find((x) => x.playerId === "E");

    expect(north?.totalMP).toBe(14);
    expect(north?.maxMP).toBe(2);

    expect(east?.totalMP).toBe(6);
    expect(east?.maxMP).toBe(2);
  });

  it("ranks players by percentage score", () => {
    const travellers: ScoredTravellerOfType<"INDIVIDUAL_MP">[] = [
      {
        type: "INDIVIDUAL_MP",
        board: 1,
        lines: [
          {
            outcome: "PO",
            score: 0,
            nId: "A",
            sId: "B",
            eId: "C",
            wId: "D",
            nsMatchPoints: 10,
            ewMatchPoints: 0,
            maxMatchPoints: 10,
          },
        ],
      },
    ];

    const result = calculateOverallMPResults(travellers);

    expect(result.lines[0].playerId).toBe("A");
    expect(result.lines[1].playerId).toBe("B");
  });
});
