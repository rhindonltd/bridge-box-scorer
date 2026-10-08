import { describe, expect, it } from "vitest";
import { ScoredTravellerOfType } from "@/scoring/overall/scored-traveller";
import { calculateOverallXIMPResults } from "./x-imp";

/** A one-line PAIR_XIMP board for the given pair and NS cross-IMP value. */
function board(
  boardNo: number,
  nsId: string,
  ewId: string,
  nsCrossImps: number,
): ScoredTravellerOfType<"PAIR_XIMP"> {
  return {
    type: "PAIR_XIMP",
    board: boardNo,
    lines: [
      {
        outcome: "1NTS=",
        score: 90,
        nsId,
        ewId,
        nsCrossImps,
        ewCrossImps: -nsCrossImps,
      },
    ],
  };
}

describe("calculateOverallXIMPResults", () => {
  it("ranks on the AVERAGE cross-IMP per board (§4.2.5)", () => {
    // NS scores +5 then +3 over two boards → average +4 (not the raw +8).
    const travellers = [
      board(1, "NS", "EW", 5),
      board(2, "NS", "EW", 3),
    ];

    const result = calculateOverallXIMPResults(travellers);

    const ns = result.lines.find((x) => x.pairId === "NS");
    const ew = result.lines.find((x) => x.pairId === "EW");

    expect(ns?.crossImps).toBe(4);
    expect(ew?.crossImps).toBe(-4);
  });

  it("compares a pair that played fewer boards on its average, not its total", () => {
    // Pair A plays THREE boards at +4 each → raw total +12, average +4.
    // Pair B plays TWO boards at +5 each (sat out the third) → raw total +10,
    // average +5. On a raw total A (12) would beat B (10); on the §4.2.5
    // per-board average B (+5) correctly outranks A (+4).
    const travellers = [
      board(1, "A", "X", 4),
      board(2, "A", "X", 4),
      board(3, "A", "X", 4),
      board(1, "B", "Y", 5),
      board(2, "B", "Y", 5),
      // Board 3 not played by B.
    ];

    const result = calculateOverallXIMPResults(travellers);

    const a = result.lines.find((x) => x.pairId === "A")!;
    const b = result.lines.find((x) => x.pairId === "B")!;

    expect(a.crossImps).toBe(4);
    expect(b.crossImps).toBe(5);
    // B ranks ahead of A despite A's larger raw total.
    expect(b.rank).toBeLessThan(a.rank);
  });

  it("returns an empty leaderboard when there are no travellers", () => {
    const result = calculateOverallXIMPResults([]);
    expect(result.type).toBe("PAIR_XIMP");
    expect(result.lines).toEqual([]);
  });
});
