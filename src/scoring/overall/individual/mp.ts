import { IndividualMatchpointOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";
import { buildOverallScore } from "../common";

export function calculateOverallMPResults(
  travellers: ScoredTravellerOfType<"INDIVIDUAL_MP">[],
): IndividualMatchpointOverallScore {
  return {
    type: "INDIVIDUAL_MP",
    mode: "INDIVIDUAL",
    scoring: "MP",
    lines: buildOverallScore({
      travellers,
      project: (line) => [
        { id: line.nId, value: line.nsMatchPoints },
        { id: line.sId, value: line.nsMatchPoints },
        { id: line.eId, value: line.ewMatchPoints },
        { id: line.wId, value: line.ewMatchPoints },
      ],
      toResult: (playerId, data) => ({
        playerId,
        totalMP: data.value,
        maxMP: data.boards ? data.boards : 0,
      }),
      sort: (x) => x.totalMP / x.maxMP,
    }),
  };
}
