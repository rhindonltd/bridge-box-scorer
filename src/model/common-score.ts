import { RankedResult } from "@/model/leaderboard";

export function rank<T>(
  rows: T[],
  getValue: (row: T) => number,
  options?: {
    descending?: boolean;
    epsilon?: number;
  },
): RankedResult<T>[] {
  const { descending = true, epsilon = 0.0001 } = options ?? {};

  // Copy + sort (don’t mutate original array)
  const sorted = [...rows].sort((a, b) => {
    const diff = getValue(a) - getValue(b);
    return descending ? -diff : diff;
  });

  const ranked: RankedResult<T>[] = [];

  let i = 0;

  while (i < sorted.length) {
    const start = i;
    const value = getValue(sorted[i]);

    // Group equal values (within epsilon)
    while (
      i < sorted.length &&
      Math.abs(getValue(sorted[i]) - value) < epsilon
    ) {
      i++;
    }

    const groupSize = i - start;
    const rank = start + 1;
    const tied = groupSize > 1;

    for (let j = start; j < i; j++) {
      ranked.push({
        ...sorted[j],
        rank,
        tied,
      });
    }
  }

  return ranked;
}
