import type { MatchpointLine } from "@/modules/scoring";
import {
  ScoreTable,
  contractCell,
  numberCell,
  textCell,
} from "@/modules/results-views/table/score-table";
import type { PerBoardView } from "@/modules/results-views/view-types";
import { pairLabel } from "@/model/pair-label";

type MpScoredLines = MatchpointLine[];

/** Rows with a real score, ordered by NS score descending. */
function displayRows(lines: MpScoredLines): MatchpointLine[] {
  return lines
    .filter((x) => x.score !== null)
    .sort((a, b) => b.score! - a.score!);
}

const matchpointsView: PerBoardView<MpScoredLines> = {
  id: "matchpoints",
  label: "MP",
  toTable(lines, options): ScoreTable {
    const hide = options?.hideSection ?? false;
    return {
      columns: [
        { label: "NS" },
        { label: "EW" },
        { label: "Contract" },
        { label: "NS Score" },
        { label: "NS MP" },
        { label: "EW MP" },
      ],
      rows: displayRows(lines).map((row) => ({
        highlightIds: [row.nsId, row.ewId],
        cells: [
          textCell(pairLabel(row.nsId, hide)),
          textCell(pairLabel(row.ewId, hide)),
          contractCell(row.outcome),
          numberCell(row.score!),
          numberCell(row.nsMatchPoints),
          numberCell(row.ewMatchPoints),
        ],
      })),
    };
  },
};

const percentageView: PerBoardView<MpScoredLines> = {
  id: "percentage",
  label: "%",
  toTable(lines, options): ScoreTable {
    const hide = options?.hideSection ?? false;
    const maxMP = 2 * (lines.length - 1);
    const toPercent = (mp: number) => (maxMP === 0 ? 0 : (mp / maxMP) * 100);

    return {
      columns: [
        { label: "NS" },
        { label: "EW" },
        { label: "Contract" },
        { label: "NS Score" },
        { label: "NS %" },
        { label: "EW %" },
      ],
      rows: displayRows(lines).map((row) => ({
        highlightIds: [row.nsId, row.ewId],
        cells: [
          textCell(pairLabel(row.nsId, hide)),
          textCell(pairLabel(row.ewId, hide)),
          contractCell(row.outcome),
          numberCell(row.score!),
          numberCell(toPercent(row.nsMatchPoints), 2),
          numberCell(toPercent(row.ewMatchPoints), 2),
        ],
      })),
    };
  },
};

/** The traveller views for this scoring, the default first. */
// Percentage first matches the previous default (Toggle started "on" = "%").
export const mpTravellerViews: PerBoardView<MpScoredLines>[] = [
  percentageView,
  matchpointsView,
];
