import { calculateOverallXIMPResults } from "@/modules/scoring/overall/pair/x-imp";
import { PairXIMPOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/modules/scoring/overall/scored-traveller";
import { OverallScoringPlugin } from "@/modules/scoring/plugins/types";

type XimpScored = ScoredTravellerOfType<"PAIR_XIMP">;
type XimpOverall = PairXIMPOverallScore;

export const ximpOverallPlugin: OverallScoringPlugin<XimpScored, XimpOverall> =
  {
    id: "XIMP",
    aggregate: (scoredTravellers) =>
      calculateOverallXIMPResults(scoredTravellers),
  };
