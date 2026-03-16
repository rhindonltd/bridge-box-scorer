import {
  ScoredPairIMPTraveller,
  ScoredPairMPTraveller,
} from "@/model/scored-traveller";
import { PairIMPResult, PairMPResult } from "@/model/overall-result";
import { Player } from "@/model/player";

export function calculateOverallIMPResults(
  pairs: Map<string, Player[]>,
  travellers: ScoredPairIMPTraveller[],
): PairIMPResult[] {
  const totals = new Map<string, { imp: number; boards: number }>();

  for (const traveller of travellers) {
    for (const line of traveller.lines) {
      if (line.nsCrossImps !== undefined) {
        const ns = totals.get(line.nsPairId) ?? { imp: 0, boards: 0 };
        ns.imp += line.nsCrossImps;
        ns.boards += 1;
        totals.set(line.nsPairId, ns);
      }

      if (line.ewCrossImps !== undefined) {
        const ew = totals.get(line.ewPairId) ?? { imp: 0, boards: 0 };
        ew.imp += line.ewCrossImps;
        ew.boards += 1;
        totals.set(line.ewPairId, ew);
      }
    }
  }

  const results: PairIMPResult[] = [];

  for (const [pairId, data] of totals.entries()) {
    results.push({
      pairId,
      crossImps: data.imp,
      boardsPlayed: data.boards,
      percentage: 50 + (data.imp / data.boards) * 6.48,
      players: pairs.get(pairId) || [],
    });
  }

  return results.sort((a, b) => b.crossImps - a.crossImps);
}

export function calculateOverallMPResults(
  pairs: Map<string, Player[]>,
  travellers: ScoredPairMPTraveller[],
): PairMPResult[] {
  const totals = new Map<
    string,
    { mp: number; maxMp: number; boards: number }
  >();

  for (const traveller of travellers) {
    for (const line of traveller.lines) {
      if (line.nsMatchPoints !== undefined) {
        const ns = totals.get(line.nsPairId) ?? { mp: 0, maxMp: 0, boards: 0 };
        ns.mp += line.nsMatchPoints;
        ns.maxMp += line.maxMatchPoints;
        ns.boards += 1;
        totals.set(line.nsPairId, ns);
      }

      if (line.ewMatchPoints !== undefined) {
        const ew = totals.get(line.ewPairId) ?? { mp: 0, maxMp: 0, boards: 0 };
        ew.mp += line.ewMatchPoints;
        ew.maxMp += line.maxMatchPoints;
        ew.boards += 1;
        totals.set(line.ewPairId, ew);
      }
    }
  }

  const results: PairMPResult[] = [];

  for (const [pairId, data] of totals.entries()) {
    results.push({
      pairId,
      totalMP: data.mp,
      maxMP: data.maxMp,
      boardsPlayed: data.boards,
      percentage: (data.mp / data.maxMp) * 100,
      players: pairs.get(pairId) || [],
    });
  }

  return results.sort((a, b) => b.percentage - a.percentage);
}
