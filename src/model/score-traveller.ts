import { ImpTable } from "@/model/imp-table";
import { getVulnerability } from "@/model/vulnerability";
import { parsePlayedContract } from "@/model/result";
import { scoreContract } from "@/model/score";
import { ParticipantsByMode } from "./participants";
import { PlayedContractCode } from "./result";

/* =========================================================
   DOMAIN
========================================================= */

type BoardOutcome = PlayedContractCode | "PO" | "NP";

type BaseTraveller<M extends Traveller["mode"]> = {
  mode: M;
  board: number;
  lines: Array<{ outcome: BoardOutcome } & ParticipantsByMode[M]>;
};

type Traveller = BaseTraveller<"PAIR"> | BaseTraveller<"INDIVIDUAL">;

type ScoringMode = "IMP" | "XIMP" | "MP";

type ResultType =
  | "PAIR_IMP"
  | "PAIR_XIMP"
  | "PAIR_MP"
  | "INDIVIDUAL_IMP"
  | "INDIVIDUAL_XIMP"
  | "INDIVIDUAL_MP";

/* =========================================================
   RESULT LINE TYPES
========================================================= */

type BasePrepared<TLine> = {
  line: TLine;
  score: number | null;
};

/* =========================================================
   HELPERS
========================================================= */

function outcomeToScore(board: number, outcome: BoardOutcome): number | null {
  if (outcome === "PO") return 0;
  if (outcome === "NP") return null;

  return scoreContract(parsePlayedContract(outcome), getVulnerability(board));
}

function prepare<TLine extends { outcome: BoardOutcome }>(
  board: number,
  lines: TLine[],
): BasePrepared<TLine>[] {
  return lines.map((line) => ({
    line,
    score: outcomeToScore(board, line.outcome),
  }));
}

/* =========================================================
   STRATEGY CONTEXT
========================================================= */

type StrategyContext<TLine> = {
  board: number;
  prepared: BasePrepared<TLine>[];
  validScores: number[];
  size: number;
};

/* =========================================================
   STRATEGY TYPES (IMPORTANT FIX)
========================================================= */

type Strategy<TLine, TResultLine> = (
  ctx: StrategyContext<TLine>,
) => TResultLine[];

/* =========================================================
   IMP
========================================================= */

type ImpLine<TLine> = TLine & {
  score: number | null;
  nsImps: number;
  ewImps: number;
};

const impStrategy: Strategy<any, any> = (ctx) => {
  return ctx.prepared.map(({ line, score }) => {
    if (score === null) {
      return { ...line, score: null, nsImps: 0, ewImps: 0 };
    }

    const imp = ImpTable.calculateImps(score);

    return {
      ...line,
      score,
      nsImps: Math.max(0, imp),
      ewImps: Math.max(0, -imp),
    };
  });
};

/* =========================================================
   XIMP
========================================================= */

type XImpLine<TLine> = TLine & {
  score: number | null;
  nsCrossImps: number;
  ewCrossImps: number;
};

const ximpStrategy: Strategy<any, any> = (ctx) => {
  return ctx.prepared.map(({ line, score }) => {
    if (score === null) {
      return { ...line, score: null, nsCrossImps: 0, ewCrossImps: 0 };
    }

    const imp = ctx.validScores.reduce(
      (acc, s) => acc + ImpTable.calculateImps(score - s),
      0,
    );

    return {
      ...line,
      score,
      nsCrossImps: imp,
      ewCrossImps: -imp,
    };
  });
};

/* =========================================================
   MATCHPOINT
========================================================= */

type MatchpointLine<TLine> = TLine & {
  score: number | null;
  maxMatchPoints: number;
  nsMatchPoints: number;
  ewMatchPoints: number;
};

const matchpointStrategy: Strategy<any, any> = (ctx) => {
  const valid = ctx.prepared.filter((p) => p.score !== null);

  if (!valid.length) return [];

  const sorted = [...valid].sort((a, b) => b.score! - a.score!);

  const result: any[] = [];
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
};

/* =========================================================
   REGISTRY (PLUGIN SYSTEM)
========================================================= */

const registry = {
  IMP: impStrategy,
  XIMP: ximpStrategy,
  MP: matchpointStrategy,
} as const;

/* =========================================================
   RESULT TYPE RESOLUTION
========================================================= */

function resolveType(
  mode: Traveller["mode"],
  scoring: ScoringMode,
): ResultType {
  return `${mode}_${scoring}` as ResultType;
}

/* =========================================================
   PUBLIC API (FULLY TYPED OUTPUT)
========================================================= */

type ScoredTravellerMap = {
  IMP: ImpLine<any>;
  XIMP: XImpLine<any>;
  MP: MatchpointLine<any>;
};

type Output<M extends Traveller["mode"], S extends ScoringMode> = {
  type: `${M}_${S}`;
  board: number;
  lines: S extends keyof ScoredTravellerMap ? ScoredTravellerMap[S][] : never;
};

export function score<M extends Traveller["mode"], S extends ScoringMode>(
  traveller: BaseTraveller<M>,
  mode: S,
): Output<M, S> {
  const fn = registry[mode];

  // ✅ NOW TYPE IS SAFE (no union anymore)
  const prepared = prepare(traveller.board, traveller.lines);

  const validScores = prepared
    .map((p) => p.score)
    .filter((x): x is number => x !== null);

  const ctx = {
    board: traveller.board,
    prepared,
    validScores,
    size: traveller.lines.length,
  };

  const lines = fn(ctx);

  return {
    type: resolveType(traveller.mode, mode),
    board: traveller.board,
    lines,
  } as Output<M, S>;
}
