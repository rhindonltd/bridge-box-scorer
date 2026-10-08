import { describe, it, expect } from "vitest";
import {
  detectRoundMismatches,
  MISMATCH_VP_THRESHOLD,
} from "./detect-mismatch";
import {
  drawSwissRound,
  type SwissDrawInput,
  type SwissPairId,
} from "@/movement/swiss/swiss-pairing";

/**
 * A clean 3-table (6-pair) corrected input with a given standings order and no
 * history (so the draw is purely by standing: 1v2, 3v4, 5v6 down the order).
 */
function input(standings: SwissPairId[]): SwissDrawInput {
  return {
    tables: 3,
    standings,
    playedOpponents: new Set(),
    hadBye: new Set(),
    hadHalfMatch: new Set(),
    oddHandling: "BYE",
    directionCounts: new Map(),
    stationary: new Map(),
  };
}

/** The opponent map the engine would produce for a given corrected input. */
function correctOpponents(
  inp: SwissDrawInput,
): Map<SwissPairId, SwissPairId> {
  const draw = drawSwissRound(inp);
  const map = new Map<SwissPairId, SwissPairId>();
  for (const t of draw.seating) {
    map.set(t.ns, t.ew);
    map.set(t.ew, t.ns);
  }
  return map;
}

describe("detectRoundMismatches", () => {
  it("flags a pair whose committed opponent is > 5 VP from the correct one", () => {
    // Corrected standings order 1,2,3,4,5,6 → correct draw is 1v2, 3v4, 5v6.
    const correctedInput = input([1, 2, 3, 4, 5, 6]);

    // Committed seating actually paired 1 against 4 (not 2) — a swap with the
    // 3v4 table, so 3 played 2. Build the committed opponents to match.
    const committed = new Map<SwissPairId, SwissPairId>([
      [1, 4],
      [4, 1],
      [3, 2],
      [2, 3],
      [5, 6],
      [6, 5],
    ]);

    // Current VP: pair 2 (correct opp of 1) has 8; pair 4 (actual opp) has 16
    // → 8 VP apart (> 5), and 4 is the HIGHER-scoring opponent.
    const vp = new Map<SwissPairId, number>([
      [1, 12],
      [2, 8],
      [3, 10],
      [4, 16],
      [5, 9],
      [6, 7],
    ]);

    const candidates = detectRoundMismatches({
      roundNumber: 3,
      correctedInput,
      committedOpponentByPair: committed,
      currentVpByPair: vp,
      committedExcludedPairs: new Set(),
    });

    // Pair 1 is flagged: actual opp 4 (16 VP) vs correct opp 2 (8 VP), HIGHER.
    const p1 = candidates.find((c) => c.mismatchedPair === 1);
    expect(p1).toBeDefined();
    expect(p1!.actualOpponent).toBe(4);
    expect(p1!.correctOpponent).toBe(2);
    expect(p1!.direction).toBe("HIGHER");
    expect(p1!.roundNumber).toBe(3);

    // Pair 3's actual opp 2 (8) vs correct opp 4 (16) → 8 apart, LOWER.
    const p3 = candidates.find((c) => c.mismatchedPair === 3);
    expect(p3).toBeDefined();
    expect(p3!.direction).toBe("LOWER");
  });

  it("does not flag a swap within the 5 VP threshold", () => {
    const correctedInput = input([1, 2, 3, 4, 5, 6]);
    const committed = new Map<SwissPairId, SwissPairId>([
      [1, 4],
      [4, 1],
      [3, 2],
      [2, 3],
      [5, 6],
      [6, 5],
    ]);
    // Pair 2 and pair 4 are within 5 VP of each other → not a mismatch.
    const vp = new Map<SwissPairId, number>([
      [1, 12],
      [2, 10],
      [3, 10],
      [4, 14], // 14 - 10 = 4 ≤ 5
      [5, 9],
      [6, 7],
    ]);

    const candidates = detectRoundMismatches({
      roundNumber: 3,
      correctedInput,
      committedOpponentByPair: committed,
      currentVpByPair: vp,
      committedExcludedPairs: new Set(),
    });
    expect(candidates).toHaveLength(0);
  });

  it("flags nothing when the committed draw matches the corrected draw", () => {
    const correctedInput = input([1, 2, 3, 4, 5, 6]);
    const committed = correctOpponents(correctedInput);
    const vp = new Map<SwissPairId, number>([
      [1, 20],
      [2, 0],
      [3, 15],
      [4, 5],
      [5, 11],
      [6, 9],
    ]);

    const candidates = detectRoundMismatches({
      roundNumber: 2,
      correctedInput,
      committedOpponentByPair: committed,
      currentVpByPair: vp,
      committedExcludedPairs: new Set(),
    });
    expect(candidates).toHaveLength(0);
  });

  it("excludes a pair in the committed half-match/bye group but still assesses ordinary tables", () => {
    // Correct draw for [1,2,3,4,5,6] is 1v2, 3v4, 5v6. Suppose this round
    // actually ran a half-match group {1,2,3} (so those are excluded) and the
    // ordinary tables committed a swap: 4 played 6 (correct 5), 5 played 4.
    const correctedInput = input([1, 2, 3, 4, 5, 6]);
    const committed = new Map<SwissPairId, SwissPairId>([
      [4, 6],
      [6, 4],
      [5, 4], // (not physically consistent, but exercises the ordinary diff)
    ]);
    const vp = new Map<SwissPairId, number>([
      [4, 10],
      [5, 2], // correct opp of 4... actually 4's correct opp is 5 here
      [6, 18], // actual opp of 4 → 18 vs 2 = 16 apart
    ]);

    const candidates = detectRoundMismatches({
      roundNumber: 3,
      correctedInput,
      committedOpponentByPair: committed,
      currentVpByPair: vp,
      committedExcludedPairs: new Set([1, 2, 3]),
    });

    // No candidate names an excluded pair (1, 2 or 3).
    expect(
      candidates.every(
        (c) =>
          ![1, 2, 3].includes(c.mismatchedPair) &&
          ![1, 2, 3].includes(c.actualOpponent) &&
          ![1, 2, 3].includes(c.correctOpponent),
      ),
    ).toBe(true);
  });

  it("uses a threshold of exactly 5 (strictly greater triggers)", () => {
    expect(MISMATCH_VP_THRESHOLD).toBe(5);

    const correctedInput = input([1, 2, 3, 4, 5, 6]);
    const committed = new Map<SwissPairId, SwissPairId>([
      [1, 4],
      [4, 1],
      [3, 2],
      [2, 3],
      [5, 6],
      [6, 5],
    ]);
    // Exactly 5 apart → NOT flagged.
    const vpAt5 = new Map<SwissPairId, number>([
      [1, 10],
      [2, 10],
      [3, 10],
      [4, 15],
      [5, 9],
      [6, 7],
    ]);
    expect(
      detectRoundMismatches({
        roundNumber: 3,
        correctedInput,
        committedOpponentByPair: committed,
        currentVpByPair: vpAt5,
        committedExcludedPairs: new Set(),
      }),
    ).toHaveLength(0);
  });
});
