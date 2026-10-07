import { computeCrossImps, prepare } from "../common";
import { PairLine } from "./common";
import {
  artificialImps,
  artificialPercents,
  classifyOutcome,
  componentCrossImps,
  weightedComponentScores,
} from "./assigned";

export type XimpLine = PairLine & {
  score: number | null;
  nsCrossImps: number;
  ewCrossImps: number;
};

/**
 * Cross-IMPs (Butler average): each real line is IMPed against every OTHER real
 * line and averaged. Director-assigned lines do not carry a comparable raw
 * table score, so they are excluded from the real lines' comparison set (the
 * real lines are scored exactly as if the assigned lines were absent). Assigned
 * lines are then valued against the real field: an artificial adjusted score
 * awards ±3 / 0 by side; a weighted assigned score awards the weight-average of
 * each component's cross-IMPs against the real field.
 */
export function scoreXIMP(board: number, lines: PairLine[]): XimpLine[] {
  const prepared = prepare(board, lines);

  // Real raw scores only — the comparison datum for cross-IMPs.
  const realScores = prepared
    .filter(
      (p) => p.score !== null && classifyOutcome(p.line.outcome) === "real",
    )
    .map((p) => p.score!);

  return prepared.map(({ line, score }): XimpLine => {
    const kind = classifyOutcome(line.outcome);

    if (kind === "artificial") {
      const pct = artificialPercents(line.outcome);
      /* v8 ignore next -- classifyOutcome==="artificial" guarantees a parse */
      const { ns, ew } = pct ?? { ns: 50, ew: 50 };
      return {
        ...line,
        score: null,
        nsCrossImps: artificialImps(ns),
        ewCrossImps: artificialImps(ew),
      };
    }

    if (kind === "weighted") {
      const components = weightedComponentScores(board, line.outcome);
      /* v8 ignore next -- classifyOutcome==="weighted" guarantees a parse */
      const comps = components ?? [];
      // Each component is cross-IMPed against the real field (not including
      // itself), then weight-averaged.
      const nsCrossImps = comps.reduce(
        (acc, c) => acc + c.weight * componentCrossImps(c.score, realScores),
        0,
      );
      return {
        ...line,
        score: null,
        nsCrossImps,
        ewCrossImps: -nsCrossImps,
      };
    }

    if (score === null) {
      return { ...line, score: null, nsCrossImps: 0, ewCrossImps: 0 };
    }

    // Real line: average IMP vs every OTHER real score. `computeCrossImps`
    // sums the pairwise IMPs (the self-term score - score contributes 0), so
    // the comparison count is the other real scores: realScores.length - 1.
    const comparisons = realScores.length - 1;
    const imp =
      comparisons > 0 ? computeCrossImps(score, realScores) / comparisons : 0;

    return {
      ...line,
      score,
      nsCrossImps: imp,
      ewCrossImps: -imp,
    };
  });
}
