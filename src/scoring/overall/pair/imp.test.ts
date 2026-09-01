import { describe, expect, it } from "vitest";
import { ScoredTravellerOfType } from "@/scoring/overall/scored-traveller";
import { calculateOverallIMPResults } from "./imp";

describe("calculateOverallIMPResults", () => {
  it("returns correct metadata for empty input", () => {
    const result = calculateOverallIMPResults([]);
    expect(result.type).toBe("PAIR_IMP");
    expect(result.mode).toBe("PAIR");
    expect(result.scoring).toBe("IMP");
    expect(result.lines).toHaveLength(0);
  });

  it("sums imps across boards and ranks by total", () => {
    const travellers: ScoredTravellerOfType<"PAIR_IMP">[] = [
      {
        type: "PAIR_IMP",
        board: 1,
        lines: [
          {
            nsId: "1",
            ewId: "2",
            outcome: "3NTN=",
            score: 400,
            nsImps: 6,
            ewImps: 0,
          },
          {
            nsId: "3",
            ewId: "4",
            outcome: "2NTN=",
            score: 120,
            nsImps: 0,
            ewImps: 6,
          },
        ],
      },
      {
        type: "PAIR_IMP",
        board: 2,
        lines: [
          {
            nsId: "1",
            ewId: "2",
            outcome: "4HN=",
            score: 620,
            nsImps: 4,
            ewImps: 0,
          },
          {
            nsId: "3",
            ewId: "4",
            outcome: "3HN=",
            score: 140,
            nsImps: 0,
            ewImps: 4,
          },
        ],
      },
    ] as any;

    const result = calculateOverallIMPResults(travellers);

    const pair1 = result.lines.find((l) => l.pairId === "1")!;
    const pair4 = result.lines.find((l) => l.pairId === "4")!;

    // Pair 1 played NS on both boards: 6 + 4 = 10.
    expect(pair1.imps).toBe(10);
    // Pair 4 played EW on both boards: 6 + 4 = 10.
    expect(pair4.imps).toBe(10);

    // Highest total is ranked first.
    expect(result.lines[0].imps).toBeGreaterThanOrEqual(result.lines[1].imps);
  });
});
