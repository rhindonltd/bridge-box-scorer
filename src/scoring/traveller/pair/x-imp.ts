import { computeCrossImps, prepare } from "../common";
import { PairLine } from "./common";

export function scoreXIMP(board: number, lines: PairLine[]) {
  const prepared = prepare(board, lines);
  const valid = prepared
    .map((p) => p.score)
    .filter((x): x is number => x !== null);

  return prepared.map(({ line, score }) => {
    if (score === null) {
      return { ...line, score: null, nsCrossImps: 0, ewCrossImps: 0 };
    }

    // Cross-IMPs (Butler average): this score is IMPed against every OTHER
    // valid score on the board via the WBF chart, then averaged over the number
    // of comparisons. `computeCrossImps` sums the pairwise IMPs (its self-term,
    // score - score, contributes 0), so the comparison count is the other valid
    // scores: valid.length - 1. With no other result there is nothing to
    // compare against, so the average is 0.
    const comparisons = valid.length - 1;
    const imp =
      comparisons > 0 ? computeCrossImps(score, valid) / comparisons : 0;

    return {
      ...line,
      score,
      nsCrossImps: imp,
      ewCrossImps: -imp,
    };
  });
}
