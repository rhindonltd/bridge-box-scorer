import { computeCrossImps, prepare } from "../common";
import { IndividualLine } from "./common";

export type XImpLine = IndividualLine & {
  score: number | null;
  nsCrossImps: number;
  ewCrossImps: number;
};

export function scoreXIMP(board: number, lines: IndividualLine[]) {
  const prepared = prepare(board, lines);
  const valid = prepared
    .map((p) => p.score)
    .filter((x): x is number => x !== null);

  return prepared.map(({ line, score }) => {
    if (score === null) {
      return { ...line, score: null, nsCrossImps: 0, ewCrossImps: 0 };
    }

    const imp = computeCrossImps(score, valid);

    return {
      ...line,
      score,
      nsCrossImps: imp,
      ewCrossImps: -imp,
    };
  });
}
