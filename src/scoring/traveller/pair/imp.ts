import { computeImps, prepare } from "../common";
import { PairLine } from "./common";

export type ImpLine = PairLine & {
  score: number | null;
  nsImps: number;
  ewImps: number;
};

export function scoreIMP(board: number, lines: PairLine[]) {
  const prepared = prepare(board, lines);

  return prepared.map(({ line, score }) => {
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
