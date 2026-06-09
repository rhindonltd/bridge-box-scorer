import { prepare } from "../common";
import { PairLine } from "./common";

export type MatchpointLine = PairLine & {
  score: number | null;
  maxMatchPoints: number;
  nsMatchPoints: number;
  ewMatchPoints: number;
};

export function scoreMP(board: number, lines: PairLine[]) {
  const prepared = prepare(board, lines);
  const valid = prepared.filter((p) => p.score !== null);

  if (!valid.length) return [];

  const sorted = [...valid].sort((a, b) => b.score! - a.score!);

  const result: MatchpointLine[] = [];

  let i = 0;

  while (i < sorted.length) {
    const score = sorted[i].score!;
    const group = sorted.filter((x) => x.score === score);

    const tied = group.length;
    const rank = i + (tied - 1) / 2;

    const max = 2 * (valid.length - 1);

    const ns = max - (rank * max) / (valid.length - 1);
    const ew = max - ns;

    for (const entry of group) {
      result.push({
        ...entry.line,
        score,
        maxMatchPoints: max,
        nsMatchPoints: ns,
        ewMatchPoints: ew,
      });
    }

    i += tied;
  }

  return result;
}
