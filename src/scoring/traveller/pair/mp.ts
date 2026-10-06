import { prepare } from "../common";
import { PairLine } from "./common";
import {
  artificialPercents,
  classifyOutcome,
  matchpointsAgainst,
  neuberg,
  weightedComponentScores,
} from "./assigned";

export type MatchpointLine = PairLine & {
  score: number | null;
  maxMatchPoints: number;
  nsMatchPoints: number;
  ewMatchPoints: number;
};

/**
 * Matchpoint a board under convention (b): director-assigned lines (artificial
 * adjusted `A<ns>/<ew>` and weighted assigned `W…`) occupy a seat in the field,
 * so the board's matchpoint maximum is `2*(N-1)` over ALL lines, and the real
 * played lines are scored over the full field via a Neuberg adjustment (not
 * over only themselves).
 *
 * - Real line: matchpointed against the other real lines, then Neuberg-scaled
 *   from `realLines-1` comparisons up to the full `N-1`.
 * - Artificial line: awarded `pct/100 * max` directly for each side.
 * - Weighted line: each component is matchpointed against the real field (then
 *   Neuberg-scaled to the full field) and the results are weight-averaged.
 */
export function scoreMP(board: number, lines: PairLine[]): MatchpointLine[] {
  const prepared = prepare(board, lines);

  // Partition into real (scorable raw result) and assigned (director ruling).
  const realLines = prepared.filter(
    (p) => p.score !== null && classifyOutcome(p.line.outcome) === "real",
  );
  const assignedLines = prepared.filter(
    (p) => classifyOutcome(p.line.outcome) !== "real",
  );

  const totalLines = realLines.length + assignedLines.length;

  // Nothing to score.
  if (totalLines === 0) return [];

  // A single line (real or assigned) has no field to be measured against:
  // max = 0 and everyone gets 0 (a neutered board), matching the prior
  // single-result behaviour.
  if (totalLines === 1) {
    const only = realLines[0] ?? assignedLines[0];
    return [
      {
        ...only.line,
        score: only.score,
        maxMatchPoints: 0,
        nsMatchPoints: 0,
        ewMatchPoints: 0,
      },
    ];
  }

  const max = 2 * (totalLines - 1);
  const realScores = realLines.map((p) => p.score!);

  const result: MatchpointLine[] = [];

  // --- Real played lines: matchpoint vs other reals, Neuberg to full field ---
  // Comparisons available among the reals, and the full field we scale up to.
  const realComparisons = realLines.length - 1;
  const fullComparisons = totalLines - 1;

  for (const entry of realLines) {
    const score = entry.score!;
    // NS matchpoints over the OTHER real lines (exclude self).
    const others = realScores.filter((_, idx) => realScores[idx] !== undefined);
    // Build the "others" list excluding this entry once.
    const otherScores = withoutOne(realScores, score);
    const rawNs = matchpointsAgainst(score, otherScores);

    const nsMatchPoints =
      realComparisons > 0
        ? neuberg(rawNs, realComparisons, fullComparisons)
        : // No other real line to compare against: this line is measured only
          // against assigned lines, which carry no comparable raw score. Give
          // it the field average (half of max) so it is neither rewarded nor
          // penalised by the ruling.
          max / 2;

    const ewMatchPoints = max - nsMatchPoints;

    result.push({
      ...entry.line,
      score,
      maxMatchPoints: max,
      nsMatchPoints,
      ewMatchPoints,
    });
    void others;
  }

  // --- Assigned lines ---
  for (const entry of assignedLines) {
    const outcome = entry.line.outcome;
    const kind = classifyOutcome(outcome);

    if (kind === "artificial") {
      const pct = artificialPercents(outcome);
      /* v8 ignore next -- classifyOutcome==="artificial" guarantees a parse */
      const { ns, ew } = pct ?? { ns: 50, ew: 50 };
      result.push({
        ...entry.line,
        score: null,
        maxMatchPoints: max,
        nsMatchPoints: (ns / 100) * max,
        ewMatchPoints: (ew / 100) * max,
      });
      continue;
    }

    // Weighted: average each component's matchpoints vs the real field.
    const components = weightedComponentScores(board, outcome);
    /* v8 ignore next -- classifyOutcome==="weighted" guarantees a parse */
    const comps = components ?? [];

    let nsMatchPoints: number;
    if (realLines.length === 0) {
      // No real field to compare against — award the field average.
      nsMatchPoints = max / 2;
    } else {
      // Each component is matchpointed against ALL real lines (it is a
      // hypothetical extra line), giving `realLines.length` comparisons, then
      // Neuberg-scaled to the full field.
      nsMatchPoints = comps.reduce((acc, c) => {
        const raw = matchpointsAgainst(c.score, realScores);
        const scaled = neuberg(raw, realLines.length, fullComparisons);
        return acc + c.weight * scaled;
      }, 0);
    }

    result.push({
      ...entry.line,
      score: null,
      maxMatchPoints: max,
      nsMatchPoints,
      ewMatchPoints: max - nsMatchPoints,
    });
  }

  return result;
}

/** Return a copy of `scores` with a single occurrence of `value` removed. */
function withoutOne(scores: number[], value: number): number[] {
  const out: number[] = [];
  let removed = false;
  for (const s of scores) {
    if (!removed && s === value) {
      removed = true;
      continue;
    }
    out.push(s);
  }
  return out;
}
