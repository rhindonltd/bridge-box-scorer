import { calculateOverallXIMPResults } from "@/scoring/overall/pair/x-imp";
import { PairXIMPOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/scoring/overall/legacy-scored-traveller";
import {
  ScoreTable,
  multilineCell,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";
import { OverallScoringPlugin, OverallView } from "@/scoring/plugins/types";
import { registerOverallPlugin } from "@/scoring/plugins/registry";
import { pairNameLines } from "./pair-names";

type XimpScored = ScoredTravellerOfType<"PAIR_XIMP">;
type XimpOverall = PairXIMPOverallScore;

const crossImpsView: OverallView<XimpOverall> = {
  id: "cross-imps",
  label: "X-IMP",
  toTable(leaderboard, participants): ScoreTable {
    return {
      columns: [{ label: "Rank" }, { label: "Pair" }, { label: "X-IMP" }],
      rows: leaderboard.lines.map((row) => ({
        highlightIds: [row.pairId],
        cells: [
          textCell(row.tied ? `${row.rank}=` : `${row.rank}`),
          multilineCell(pairNameLines(participants, row.pairId)),
          numberCell(row.crossImps),
        ],
      })),
    };
  },
};

export const ximpOverallPlugin: OverallScoringPlugin<XimpScored, XimpOverall> = {
  id: "XIMP",
  aggregate: (scoredTravellers) =>
    calculateOverallXIMPResults(scoredTravellers),
  views: [crossImpsView],
};

registerOverallPlugin(ximpOverallPlugin);
