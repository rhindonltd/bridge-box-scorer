import { parsePlayedContract, PlayedContractCode } from "@/model/result";
import { scoreContract } from "@/model/score";
import { getVulnerability } from "@/model/vulnerability";
import { ImpTable } from "@/model/imp-table";
import { IndividualTraveller, PairTraveller } from "@/model/traveller";
import {
  ScoredTravellerBaseFromType,
  AnyScoredTravellerType,
} from "@/model/scored-traveller";

/* ---------- types ---------- */

export type SpecialBoardOutcome = "PO" | "NP";
export type BoardOutcome = PlayedContractCode | SpecialBoardOutcome;

/* ---------- helpers ---------- */

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

/* ---------- generic pipeline ---------- */

type ScoreLineFn<TLine, TOut> = (
  entry: ScoreEntry<TLine>,
  ctx: {
    validScores: number[];
    allEntries: ScoreEntry<TLine>[];
    travellerSize: number;
  },
) => TOut;

function scoreTraveller<TLine extends { outcome: BoardOutcome }, TOut>(
  traveller: { board: number; lines: TLine[] },
  type: AnyScoredTravellerType,
  scoreLine: ScoreLineFn<TLine, TOut>,
) {
  const prepared = prepareScores(traveller.board, traveller.lines);

  const validScores = prepared
    .map((x) => x.score)
    .filter((x): x is number => x !== null);

  const lines = prepared.map((entry) =>
    scoreLine(entry, {
      validScores,
      allEntries: prepared,
      travellerSize: traveller.lines.length,
    }),
  );

  return {
    type,
    board: traveller.board,
    lines,
  };
}

/* ---------- strategies ---------- */

const impStrategy: ScoreLineFn<any, any> = (entry) => {
  if (entry.score === null) {
    return { ...entry.line, score: null, nsImps: 0, ewImps: 0 };
  }

  const impTotal = ImpTable.calculateImps(entry.score);

  return {
    ...entry.line,
    score: entry.score,
    nsImps: impTotal > 0 ? impTotal : 0,
    ewImps: impTotal < 0 ? -impTotal : 0,
  };
};

const ximpStrategy: ScoreLineFn<any, any> = (entry, ctx) => {
  if (entry.score === null) {
    return { ...entry.line, score: null, nsCrossImps: 0, ewCrossImps: 0 };
  }

  const impTotal = compareWithField(entry.score, ctx.validScores);

  const crossImps =
    (ctx.travellerSize * impTotal) /
    (ctx.validScores.length * (ctx.travellerSize - 1));

  return {
    ...entry.line,
    score: entry.score,
    nsCrossImps: crossImps,
    ewCrossImps: -crossImps,
  };
};

function matchpointStrategy<TLine extends { outcome: BoardOutcome }>(
  traveller: { board: number; lines: TLine[] },
  type: AnyScoredTravellerType,
) {
  const prepared = prepareScores(traveller.board, traveller.lines);
  const valid = prepared.filter((x) => x.score !== null);

  const numberPlayed = valid.length;
  if (numberPlayed === 0) {
    return { type, board: traveller.board, lines: [] };
  }

  const sorted = [...valid].sort((a, b) => b.score! - a.score!);

  const lines: any[] = [];
  let index = 0;

  while (index < sorted.length) {
    const score = sorted[index].score!;
    const group = sorted.filter((x) => x.score === score);

    const tiedCount = group.length;
    const averageRank = index + (tiedCount - 1) / 2;

    const maxMatchPoints = 2 * (numberPlayed - 1);

    const nsMatchPoints =
      maxMatchPoints - (averageRank * maxMatchPoints) / (numberPlayed - 1);

    const ewMatchPoints = maxMatchPoints - nsMatchPoints;

    for (const entry of group) {
      lines.push({
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
    type,
    board: traveller.board,
    lines,
  };
}

/* ---------- registry ---------- */

const scoringRegistry = {
  INDIVIDUAL_IMP: impStrategy,
  PAIR_IMP: impStrategy,

  INDIVIDUAL_XIMP: ximpStrategy,
  PAIR_XIMP: ximpStrategy,

  INDIVIDUAL_MP: "MATCHPOINT",
  PAIR_MP: "MATCHPOINT",
} as const;

/* ---------- type helpers ---------- */

type TravellerByType<T extends AnyScoredTravellerType> =
  T extends `PAIR_${string}`
    ? PairTraveller
    : T extends `INDIVIDUAL_${string}`
      ? IndividualTraveller
      : never;

/* ---------- main entry ---------- */

export function score<T extends `PAIR_${string}`>(
  traveller: PairTraveller,
  type: T,
): ScoredTravellerBaseFromType<T>;

export function score<T extends `INDIVIDUAL_${string}`>(
  traveller: IndividualTraveller,
  type: T,
): ScoredTravellerBaseFromType<T>;

export function score<T extends AnyScoredTravellerType>(
  traveller: PairTraveller | IndividualTraveller,
  type: T,
): ScoredTravellerBaseFromType<T> {
  const strategy = scoringRegistry[type];

  if (strategy === "MATCHPOINT") {
    return matchpointStrategy(
      traveller as any,
      type,
    ) as ScoredTravellerBaseFromType<T>;
  }

  return scoreTraveller(
    traveller as any,
    type,
    strategy,
  ) as ScoredTravellerBaseFromType<T>;
}
