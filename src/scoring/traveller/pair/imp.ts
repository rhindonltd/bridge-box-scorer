import { computeImps, prepare } from "../common";
import { PairLine } from "./common";
import {
  artificialImps,
  artificialPercents,
  classifyOutcome,
  componentImps,
  weightedComponentScores,
} from "./assigned";

export type ImpLine = PairLine & {
  score: number | null;
  nsImps: number;
  ewImps: number;
};

/**
 * Butler (datum-less) IMPs per line. Director-assigned lines are valued
 * independently of the field, matching the fixed-award convention used at
 * export: an artificial adjusted score awards ±3 / 0 IMPs by side, and a
 * weighted assigned score awards the weight-average of each component's Butler
 * IMPs. Real lines are unchanged (each IMPed on its own raw score).
 */
export function scoreIMP(board: number, lines: PairLine[]): ImpLine[] {
  const prepared = prepare(board, lines);

  return prepared.map(({ line, score }) => {
    const kind = classifyOutcome(line.outcome);

    if (kind === "artificial") {
      const pct = artificialPercents(line.outcome);
      /* v8 ignore next -- classifyOutcome==="artificial" guarantees a parse */
      const { ns, ew } = pct ?? { ns: 50, ew: 50 };
      return {
        ...line,
        score: null,
        nsImps: artificialImps(ns),
        ewImps: artificialImps(ew),
      };
    }

    if (kind === "weighted") {
      const components = weightedComponentScores(board, line.outcome);
      /* v8 ignore next -- classifyOutcome==="weighted" guarantees a parse */
      const comps = components ?? [];
      const nsImps = comps.reduce(
        (acc, c) => acc + c.weight * componentImps(c.score),
        0,
      );
      return {
        ...line,
        score: null,
        nsImps: Math.max(0, nsImps),
        ewImps: Math.max(0, -nsImps),
      };
    }

    if (score === null) {
      return { ...line, score: null, nsImps: 0, ewImps: 0 };
    }

    const imp = computeImps(score);

    return {
      ...line,
      score,
      nsImps: Math.max(0, imp),
      ewImps: Math.max(0, -imp),
    };
  });
}
