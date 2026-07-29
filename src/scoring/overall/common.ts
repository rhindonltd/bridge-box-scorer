import { rank } from "@/scoring/overall/rank";

/* =========================================================
   GENERIC TYPES
========================================================= */

type Totals = {
  value: number;
  boards: number;
  max: number;
};

function init(): Totals {
  return { value: 0, boards: 0, max: 0 };
}

function add(map: Map<string, Totals>, id: string, value: number, max = 0) {
  const entry = map.get(id) ?? init();

  entry.value += value;
  entry.boards += 1;
  entry.max += max;

  map.set(id, entry);
}

/* =========================================================
   CORE ENGINE
========================================================= */

type Projection = {
  id: string;
  value: number;
  max?: number;
};

type OverallConfig<TLine, TResultLine> = {
  travellers: { lines: TLine[] }[];
  project: (line: TLine) => Projection[];
  toResult: (id: string, data: Totals) => TResultLine;
  sort: (r: TResultLine) => number;
};

export function buildOverallScore<TLine, TResultLine>({
  travellers,
  project,
  toResult,
  sort,
}: OverallConfig<TLine, TResultLine>) {
  const totals = new Map<string, Totals>();

  for (const traveller of travellers) {
    for (const line of traveller.lines) {
      const projections = project(line);

      for (const p of projections) {
        add(totals, p.id, p.value, p.max ?? 0);
      }
    }
  }

  const results: TResultLine[] = [];

  for (const [id, data] of totals.entries()) {
    results.push(toResult(id, data));
  }

  return rank(results, sort);
}
