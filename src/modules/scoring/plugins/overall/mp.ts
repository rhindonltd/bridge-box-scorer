import { calculateOverallMPResults } from "@/modules/scoring/overall/pair/mp";
import { PairMatchpointOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/modules/scoring/overall/scored-traveller";
import { OverallScoringPlugin } from "@/modules/scoring/plugins/types";

type MpScored = ScoredTravellerOfType<"PAIR_MP">;
type MpOverall = PairMatchpointOverallScore;

export const mpOverallPlugin: OverallScoringPlugin<MpScored, MpOverall> = {
  id: "MP",
  aggregate: (scoredTravellers) => calculateOverallMPResults(scoredTravellers),
};
