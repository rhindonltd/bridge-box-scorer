import { calculateOverallMPResults } from "@/scoring/overall/pair/mp";
import { PairMatchpointOverallScore } from "@/model/leaderboard";
import { ScoredTravellerOfType } from "@/scoring/overall/scored-traveller";
import {
  ScoreTable,
  multilineCell,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";
import { OverallScoringPlugin, OverallView } from "@/scoring/plugins/types";
import { registerOverallPlugin } from "@/scoring/plugins/registry";
import { pairNameLines } from "./pair-names";

type MpScored = ScoredTravellerOfType<"PAIR_MP">;
type MpOverall = PairMatchpointOverallScore;

function rankCell(row: MpOverall["lines"][number]) {
  return textCell(row.tied ? `${row.rank}=` : `${row.rank}`);
}

const mpView: OverallView<MpOverall> = {
  id: "matchpoints",
  label: "MP",
  toTable(leaderboard, participants): ScoreTable {
    return {
      columns: [{ label: "Rank" }, { label: "Pair" }, { label: "MP" }],
      rows: leaderboard.lines.map((row) => ({
        highlightIds: [row.pairId],
        cells: [
          rankCell(row),
          multilineCell(pairNameLines(participants, row.pairId)),
          textCell(`${row.totalMP}/${row.maxMP}`),
        ],
      })),
    };
  },
};

const percentageView: OverallView<MpOverall> = {
  id: "percentage",
  label: "%",
  toTable(leaderboard, participants): ScoreTable {
    return {
      columns: [{ label: "Rank" }, { label: "Pair" }, { label: "MP" }],
      rows: leaderboard.lines.map((row) => ({
        highlightIds: [row.pairId],
        cells: [
          rankCell(row),
          multilineCell(pairNameLines(participants, row.pairId)),
          numberCell(row.maxMP === 0 ? 0 : (row.totalMP / row.maxMP) * 100, 2),
        ],
      })),
    };
  },
};

export const mpOverallPlugin: OverallScoringPlugin<MpScored, MpOverall> = {
  id: "MP",
  aggregate: (scoredTravellers) => calculateOverallMPResults(scoredTravellers),
  // Percentage first matches the previous leaderboard default (Toggle "on"="%").
  views: [percentageView, mpView],
};

registerOverallPlugin(mpOverallPlugin);
