import {
  PairXIMPScoredTraveller,
  PairMatchpointScoredTraveller,
} from "@/model/scored-traveller";
import { rank } from "@/model/common-score";
import {
  OverallLine,
  PairMatchpointOverallScore,
  PairXIMPOverallScore,
} from "./leaderboard";

export function calculateOverallXIMPResults(
  travellers: PairXIMPScoredTraveller[],
): PairXIMPOverallScore {
  const totals = new Map<string, { imp: number; boards: number }>();

  for (const traveller of travellers) {
    for (const line of traveller.lines) {
      if (line.nsCrossImps !== undefined) {
        const ns = totals.get(line.nsId) ?? { imp: 0, boards: 0 };
        ns.imp += line.nsCrossImps;
        ns.boards += 1;
        totals.set(line.nsId, ns);
      }

      if (line.ewCrossImps !== undefined) {
        const ew = totals.get(line.ewId) ?? { imp: 0, boards: 0 };
        ew.imp += line.ewCrossImps;
        ew.boards += 1;
        totals.set(line.ewId, ew);
      }
    }
  }

  const results: OverallLine<"PAIR", "XIMP">[] = [];

  for (const [pairId, data] of totals.entries()) {
    results.push({
      pairId,
      crossImps: data.imp,
    });
  }

  return {
    type: "PAIR_XIMP",
    mode: "PAIR",
    scoring: "XIMP",
    lines: rank(results, (x) => x.crossImps),
  };
}

export function calculateOverallMPResults(
  travellers: PairMatchpointScoredTraveller[],
): PairMatchpointOverallScore {
  const totals = new Map<
    string,
    { mp: number; maxMp: number; boards: number }
  >();

  for (const traveller of travellers) {
    for (const line of traveller.lines) {
      if (line.nsMatchPoints !== undefined) {
        const ns = totals.get(line.nsId) ?? { mp: 0, maxMp: 0, boards: 0 };
        ns.mp += line.nsMatchPoints;
        ns.maxMp += line.maxMatchPoints;
        ns.boards += 1;
        totals.set(line.nsId, ns);
      }

      if (line.ewMatchPoints !== undefined) {
        const ew = totals.get(line.ewId) ?? { mp: 0, maxMp: 0, boards: 0 };
        ew.mp += line.ewMatchPoints;
        ew.maxMp += line.maxMatchPoints;
        ew.boards += 1;
        totals.set(line.ewId, ew);
      }
    }
  }

  const results: OverallLine<"PAIR", "MP">[] = [];

  for (const [pairId, data] of totals.entries()) {
    results.push({
      pairId,
      totalMP: data.mp,
      maxMP: data.maxMp,
    });
  }

  return {
    type: "PAIR_MP",
    mode: "PAIR",
    scoring: "MP",
    lines: rank(results, (x) => x.totalMP / x.maxMP),
  };
}
