import { calculateOverallIMPResults } from "@/scoring/overall/pair/imp";
import { PairIMPOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/scoring/overall/scored-traveller";
import { OverallScoringPlugin } from "@/scoring/plugins/types";
import { registerOverallPlugin } from "@/scoring/plugins/registry";
import { buildImpView } from "./overall-view";

type ImpScored = ScoredTravellerOfType<"PAIR_IMP">;
type ImpOverall = PairIMPOverallScore;

const impView = buildImpView<ImpOverall["lines"][number]>({
  id: "imps",
  label: "IMP",
  value: (row) => row.imps,
  // §4.2.5: the overall IMP figure is now the AVERAGE IMP per board (scaled by
  // boards played), which is fractional — show to 2 decimal places.
  decimals: 2,
});

export const impOverallPlugin: OverallScoringPlugin<ImpScored, ImpOverall> = {
  id: "IMP",
  aggregate: (scoredTravellers) => calculateOverallIMPResults(scoredTravellers),
  views: [impView],
};

registerOverallPlugin(impOverallPlugin);
