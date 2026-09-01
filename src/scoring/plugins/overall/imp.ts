import { calculateOverallIMPResults } from "@/scoring/overall/pair/imp";
import { PairIMPOverallScore } from "@/model/leaderboard";
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

type ImpScored = ScoredTravellerOfType<"PAIR_IMP">;
type ImpOverall = PairIMPOverallScore;

const impView: OverallView<ImpOverall> = {
  id: "imps",
  label: "IMP",
  toTable(leaderboard, participants): ScoreTable {
    return {
      columns: [{ label: "Rank" }, { label: "Pair" }, { label: "IMP" }],
      rows: leaderboard.lines.map((row) => ({
        highlightIds: [row.pairId],
        cells: [
          textCell(row.tied ? `${row.rank}=` : `${row.rank}`),
          multilineCell(pairNameLines(participants, row.pairId)),
          numberCell(row.imps),
        ],
      })),
    };
  },
};

export const impOverallPlugin: OverallScoringPlugin<ImpScored, ImpOverall> = {
  id: "IMP",
  aggregate: (scoredTravellers) => calculateOverallIMPResults(scoredTravellers),
  views: [impView],
};

registerOverallPlugin(impOverallPlugin);
