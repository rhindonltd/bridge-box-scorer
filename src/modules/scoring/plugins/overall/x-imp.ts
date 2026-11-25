import { calculateOverallXIMPResults } from "@/modules/scoring/overall/pair/x-imp";
import { PairXIMPOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/modules/scoring/overall/scored-traveller";
import { OverallScoringPlugin } from "@/modules/scoring/plugins/types";
import { buildImpView } from "./overall-view";

type XimpScored = ScoredTravellerOfType<"PAIR_XIMP">;
type XimpOverall = PairXIMPOverallScore;

const crossImpsView = buildImpView<XimpOverall["lines"][number]>({
  id: "cross-imps",
  label: "X-IMP",
  value: (row) => row.crossImps,
  // Cross-IMP is the AVERAGE Butler IMP per board (§4.2.5 scales by boards
  // played), so it is fractional — show to 2 decimal places.
  decimals: 2,
});

export const ximpOverallPlugin: OverallScoringPlugin<XimpScored, XimpOverall> =
  {
    id: "XIMP",
    aggregate: (scoredTravellers) =>
      calculateOverallXIMPResults(scoredTravellers),
    views: [crossImpsView],
  };
