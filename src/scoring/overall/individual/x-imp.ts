import { IndividualXIMPOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";
import { buildOverallScore } from "../common";

export function calculateOverallXIMPResults(
  travellers: ScoredTravellerOfType<"INDIVIDUAL_XIMP">[],
): IndividualXIMPOverallScore {
  return {
    type: "INDIVIDUAL_XIMP",
    mode: "INDIVIDUAL",
    scoring: "XIMP",
    lines: buildOverallScore({
      travellers,
      project: (line) => [
        { id: line.nId, value: line.nsCrossImps },
        { id: line.sId, value: line.nsCrossImps },
        { id: line.eId, value: line.ewCrossImps },
        { id: line.wId, value: line.ewCrossImps },
      ],
      toResult: (playerId, data) => ({
        playerId,
        crossImps: data.value,
      }),
      sort: (x) => x.crossImps,
    }),
  };
}
