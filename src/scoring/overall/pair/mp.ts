import { PairMatchpointOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";
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
        { id: line.nsId, value: line.nsMatchPoints },
        { id: line.ewId, value: line.ewMatchPoints },
      ],
      toResult: (pairId, data) => ({
        pairId,
        totalMP: data.value,
        maxMP: data.boards ? data.boards : 0,
      }),
      sort: (x) => x.totalMP / x.maxMP,
    }),
  };
}
