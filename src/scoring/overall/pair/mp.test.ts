import { describe, expect, it } from "vitest";

import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";
import { calculateOverallMPResults } from "./mp";

describe("calculateOverallMPResults", () => {
  it("returns correct metadata", () => {
    const travellers: ScoredTravellerOfType<"PAIR_MP">[] = [];

    const result = calculateOverallMPResults(travellers);

    expect(result.type).toBe("PAIR_MP");
    expect(result.mode).toBe("PAIR");
    expect(result.scoring).toBe("MP");
  });

  it("awards NS match points", () => {
    const travellers: ScoredTravellerOfType<"PAIR_MP">[] = [
      {
        type: "PAIR_MP",
        board: 1,
        lines: [
          {
            outcome: "PO",
            score: 0,
            nsId: "NS",
            ewId: "EW",
            nsMatchPoints: 8,
            ewMatchPoints: 2,
            maxMatchPoints: 10,
          },
        ],
      },
    ];

    const result = calculateOverallMPResults(travellers);

    const ns = result.lines.find((x) => x.pairId === "NS");

    expect(ns?.totalMP).toBe(8);
  });

  it("awards EW match points", () => {
    const travellers: ScoredTravellerOfType<"PAIR_MP">[] = [
      {
        type: "PAIR_MP",
        board: 1,
        lines: [
          {
            outcome: "PO",
            score: 0,
            nsId: "NS",
            ewId: "EW",
            nsMatchPoints: 8,
            ewMatchPoints: 2,
            maxMatchPoints: 10,
          },
        ],
      },
    ];

    const result = calculateOverallMPResults(travellers);

    const ew = result.lines.find((x) => x.pairId === "EW");

    expect(ew?.totalMP).toBe(2);
  });

  it("aggregates scores across multiple boards", () => {
    const travellers: ScoredTravellerOfType<"PAIR_MP">[] = [
      {
        type: "PAIR_MP",
        board: 1,
        lines: [
          {
            outcome: "PO",
            score: 0,
            nsId: "NS",
            ewId: "EW",
            nsMatchPoints: 8,
            ewMatchPoints: 2,
            maxMatchPoints: 10,
          },
        ],
      },
      {
        type: "PAIR_MP",
        board: 2,
        lines: [
          {
            outcome: "PO",
            score: 0,
            nsId: "NS",
            ewId: "EW",
            nsMatchPoints: 6,
            ewMatchPoints: 4,
            maxMatchPoints: 10,
          },
        ],
      },
    ];

    const result = calculateOverallMPResults(travellers);

    const ns = result.lines.find((x) => x.pairId === "NS");
    const ew = result.lines.find((x) => x.pairId === "EW");

    expect(ns?.totalMP).toBe(14);
    expect(ns?.maxMP).toBe(20);

    expect(ew?.totalMP).toBe(6);
    expect(ew?.maxMP).toBe(20);
  });

  it("ranks players by percentage score", () => {
    const travellers: ScoredTravellerOfType<"PAIR_MP">[] = [
      {
        type: "PAIR_MP",
        board: 1,
        lines: [
          {
            outcome: "PO",
            score: 0,
            nsId: "NS",
            ewId: "EW",
            nsMatchPoints: 10,
            ewMatchPoints: 0,
            maxMatchPoints: 10,
          },
        ],
      },
    ];

    const result = calculateOverallMPResults(travellers);

    expect(result.lines[0].pairId).toBe("NS");
    expect(result.lines[1].pairId).toBe("EW");
  });
});
