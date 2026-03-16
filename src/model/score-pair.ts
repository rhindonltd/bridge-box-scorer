import { ScoredPairMPTraveller } from "@/model/scored-traveller";
import { PairMPResult } from "@/model/overall-result";
import { Player } from "@/model/player";

export function calculateOverallMPResults(
  pairs: Map<string, Player[]>,
  travellers: ScoredPairMPTraveller[],
): PairMPResult[] {
  const totals = new Map<string, { mp: number; boards: number }>();

  for (const traveller of travellers) {
    for (const line of traveller.lines) {
      if (line.nsMatchPoints !== undefined) {
        const ns = totals.get(line.nsPairId) ?? { mp: 0, boards: 0 };
        ns.mp += line.nsMatchPoints;
        ns.boards += 1;
        totals.set(line.nsPairId, ns);
      }

      if (line.ewMatchPoints !== undefined) {
        const ew = totals.get(line.ewPairId) ?? { mp: 0, boards: 0 };
        ew.mp += line.ewMatchPoints;
        ew.boards += 1;
        totals.set(line.ewPairId, ew);
      }
    }
  }

  const results: PairMPResult[] = [];

  for (const [pairId, data] of totals.entries()) {
    const maxMP = data.boards * 2; // max per board = 2*(n-1) normalized → 2
    const percentage = (data.mp / maxMP) * 100;

    results.push({
      pairId,
      totalMP: data.mp,
      boardsPlayed: data.boards,
      percentage,
      players: pairs.get(pairId) || [],
    });
  }

  return results.sort((a, b) => b.percentage - a.percentage);
}
