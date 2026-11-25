import type { PairMatchpointOverallScore } from "@/model/leaderboard";
import {
  ScoreTable,
  multilineCell,
  numberCell,
  textCell,
} from "@/modules/results-views/table/score-table";
import type { OverallView } from "@/modules/results-views/view-types";
import { pairNameLines } from "./pair-names";
import { rankCell } from "./overall-view";

type MpOverall = PairMatchpointOverallScore;

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
      columns: [{ label: "Rank" }, { label: "Pair" }, { label: "%" }],
      rows: leaderboard.lines.map((row) => ({
        highlightIds: [row.pairId],
        cells: [
          rankCell(row),
          multilineCell(pairNameLines(participants, row.pairId)),
          // Before any board is played (maxMP === 0) show the conventional 50%
          // starting point rather than 0%.
          numberCell(row.maxMP === 0 ? 50 : (row.totalMP / row.maxMP) * 100, 2),
        ],
      })),
    };
  },
};

/** The matchpoint pairs leaderboard views, the default first. */
// Percentage first matches the previous leaderboard default (Toggle "on"="%").
export const mpLeaderboardViews: OverallView<MpOverall>[] = [
  percentageView,
  mpView,
];
