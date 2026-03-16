import { parsePlayedContract, PlayedContractCode } from "@/model/result";
import { scoreContract } from "@/model/score";
import { getVulnerability } from "@/model/vulnerability";
import { ImpTable } from "@/model/imp-table";
import { PairIMPTraveller, PairMPTraveller } from "@/model/traveller";
import {
  CrossImpScore,
  MatchpointScore,
  ScoredPairIMPTraveller,
  ScoredPairMPTraveller,
  ScoredPairTravellerLine,
} from "@/model/scored-traveller";

export type BoardOutcome = PlayedContractCode | "PO" | "NP";

export function outcomeToScore(
  boardNumber: number,
  outcome: BoardOutcome,
): number | null {
  if (outcome === "PO") return 0;
  if (outcome === "NP") return null;

  return scoreContract(
    parsePlayedContract(outcome),
    getVulnerability(boardNumber),
  );
}

export interface ScoreEntry<TLine> {
  line: TLine;
  score: number | null;
}

export function prepareScores<TLine extends { outcome: BoardOutcome }>(
  boardNumber: number,
  lines: TLine[],
): ScoreEntry<TLine>[] {
  return lines.map((line) => ({
    line,
    score: outcomeToScore(boardNumber, line.outcome),
  }));
}

export function compareWithField(score: number, scores: number[]): number {
  let total = 0;

  for (const other of scores) {
    total += ImpTable.calculateImps(score - other);
  }

  return total;
}

export function scoreCrossIMP(
  traveller: PairIMPTraveller,
): ScoredPairIMPTraveller {
  const prepared = prepareScores(traveller.board, traveller.lines);

  const validScores = prepared
    .map((x) => x.score)
    .filter((x): x is number => x !== null);

  const lines = prepared.map(
    (entry): ScoredPairTravellerLine<CrossImpScore> => {
      // Not played
      if (entry.score === null) {
        return {
          ...entry.line,
          score: null,
          nsCrossImps: 0,
          ewCrossImps: 0,
        };
      }

      const impTotal = compareWithField(entry.score, validScores);
      const maximumTimesBoardPlayed = traveller.lines.length;

      const crossImps =
        (maximumTimesBoardPlayed * impTotal) /
        (validScores.length * (maximumTimesBoardPlayed - 1));

      return {
        ...entry.line,
        score: entry.score,
        nsCrossImps: crossImps,
        ewCrossImps: -crossImps,
      };
    },
  );

  return { ...traveller, lines };
}

export function scoreMatchpoints(
  traveller: PairMPTraveller,
): ScoredPairMPTraveller {
  // Convert outcomes to numeric scores
  const prepared = prepareScores(traveller.board, traveller.lines);

  // Filter out lines with null scores
  const valid = prepared.filter((x) => x.score !== null);

  const numberPlayed = valid.length;
  if (numberPlayed === 0)
    return {
      ...traveller,
    } as ScoredPairMPTraveller; // no scored lines

  // Sort descending: higher score = better
  const sorted = [...valid].sort((a, b) => b.score! - a.score!);

  const result: ScoredPairTravellerLine<MatchpointScore>[] = [];
  let index = 0;

  while (index < sorted.length) {
    const score = sorted[index].score!;
    const group = sorted.filter((x) => x.score === score);

    // Neuberg: average rank within tied group
    const rank = index; // zero-based rank of first in group
    const tiedCount = group.length;
    const averageRank = rank + (tiedCount - 1) / 2;

    // Total available MPs for this board
    const maxMatchPoints = 2 * (numberPlayed - 1);

    // NS matchpoints scaled with Neuberg correction
    const nsMatchPoints =
      maxMatchPoints - (averageRank * maxMatchPoints) / (numberPlayed - 1);
    const ewMatchPoints = maxMatchPoints - nsMatchPoints;

    for (const entry of group) {
      result.push({
        ...entry.line,
        score: entry.score,
        maxMatchPoints,
        nsMatchPoints,
        ewMatchPoints,
      });
    }

    index += tiedCount;
  }

  return {
    ...traveller,
    lines: result,
  };
}

export function scoreButler(
  traveller: PairIMPTraveller,
): ScoredPairIMPTraveller {
  const prepared = prepareScores(traveller.board, traveller.lines);

  const validScores = prepared
    .map((x) => x.score)
    .filter((x): x is number => x !== null);

  const average = validScores.reduce((a, b) => a + b, 0) / validScores.length;

  const lines = prepared.map(
    (entry): ScoredPairTravellerLine<CrossImpScore> => {
      if (entry.score === null) {
        return { ...entry.line, score: null, nsCrossImps: 0, ewCrossImps: 0 };
      }

      const imps = ImpTable.calculateImps(entry.score - average);

      return {
        ...entry.line,
        score: entry.score,
        nsCrossImps: imps,
        ewCrossImps: -imps,
      };
    },
  );

  return { ...traveller, lines };
}
