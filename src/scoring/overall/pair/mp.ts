import { PairMatchpointOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/scoring/overall/scored-traveller";
import { buildOverallScore } from "../common";

export function calculateOverallMPResults(
  travellers: ScoredTravellerOfType<"PAIR_MP">[],
): PairMatchpointOverallScore {
  return {
    type: "PAIR_MP",
    mode: "PAIR",
    scoring: "MP",
    lines: buildOverallScore({
      travellers,
      project: (line) => [
        { id: line.nsId, value: line.nsMatchPoints, max: line.maxMatchPoints },
        { id: line.ewId, value: line.ewMatchPoints, max: line.maxMatchPoints },
      ],
      toResult: (pairId, data) => ({
        pairId,
        totalMP: data.value,
        maxMP: data.max,
      }),
      sort: (x) => (x.maxMP > 0 ? x.totalMP / x.maxMP : 0),
    }),
  };
}
