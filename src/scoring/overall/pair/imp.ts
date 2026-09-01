import { PairIMPOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/scoring/overall/scored-traveller";
import { buildOverallScore } from "../common";

export function calculateOverallIMPResults(
  travellers: ScoredTravellerOfType<"PAIR_IMP">[],
): PairIMPOverallScore {
  return {
    type: "PAIR_IMP",
    mode: "PAIR",
    scoring: "IMP",
    lines: buildOverallScore({
      travellers,
      project: (line) => [
        { id: line.nsId, value: line.nsImps },
        { id: line.ewId, value: line.ewImps },
      ],
      toResult: (pairId, data) => ({
        pairId,
        imps: data.value,
      }),
      sort: (x) => x.imps,
    }),
  };
}
