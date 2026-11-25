import type { PairXIMPOverallScore } from "@/model/leaderboard";
import type { OverallView } from "@/modules/results-views/view-types";
import { buildImpView } from "./overall-view";

type XimpOverall = PairXIMPOverallScore;

const crossImpsView = buildImpView<XimpOverall["lines"][number]>({
  id: "cross-imps",
  label: "X-IMP",
  value: (row) => row.crossImps,
  // Cross-IMP is the AVERAGE Butler IMP per board (§4.2.5 scales by boards
  // played), so it is fractional — show to 2 decimal places.
  decimals: 2,
});

/** The Cross-IMP pairs leaderboard views. */
export const ximpLeaderboardViews: OverallView<XimpOverall>[] = [crossImpsView];
