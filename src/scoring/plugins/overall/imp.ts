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
});

export const impOverallPlugin: OverallScoringPlugin<ImpScored, ImpOverall> = {
  id: "IMP",
  aggregate: (scoredTravellers) => calculateOverallIMPResults(scoredTravellers),
  views: [impView],
};

registerOverallPlugin(impOverallPlugin);
