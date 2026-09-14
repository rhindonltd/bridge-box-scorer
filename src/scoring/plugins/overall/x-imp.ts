import { calculateOverallXIMPResults } from "@/scoring/overall/pair/x-imp";
import { PairXIMPOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/scoring/overall/scored-traveller";
import { OverallScoringPlugin } from "@/scoring/plugins/types";
import { registerOverallPlugin } from "@/scoring/plugins/registry";
import { buildImpView } from "./overall-view";

type XimpScored = ScoredTravellerOfType<"PAIR_XIMP">;
type XimpOverall = PairXIMPOverallScore;

const crossImpsView = buildImpView<XimpOverall["lines"][number]>({
  id: "cross-imps",
  label: "X-IMP",
  value: (row) => row.crossImps,
});

export const ximpOverallPlugin: OverallScoringPlugin<XimpScored, XimpOverall> =
  {
    id: "XIMP",
    aggregate: (scoredTravellers) =>
      calculateOverallXIMPResults(scoredTravellers),
    views: [crossImpsView],
  };

registerOverallPlugin(ximpOverallPlugin);
