import { PairXIMPOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";
import { buildOverallScore } from "../common";

export function calculateOverallXIMPResults(
  travellers: ScoredTravellerOfType<"PAIR_XIMP">[],
): PairXIMPOverallScore {
  return {
    type: "PAIR_XIMP",
    mode: "PAIR",
    scoring: "XIMP",
    lines: buildOverallScore({
      travellers,
      project: (line) => [
        { id: line.nsId, value: line.nsCrossImps },
        { id: line.ewId, value: line.ewCrossImps },
      ],
      toResult: (pairId, data) => ({
        pairId,
        crossImps: data.value,
      }),
      sort: (x) => x.crossImps,
    }),
  };
}
