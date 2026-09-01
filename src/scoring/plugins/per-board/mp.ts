import { scoreMP, MatchpointLine } from "@/scoring/traveller/pair/mp";
import { Traveller } from "@/model/traveller";
import {
  ScoreTable,
  contractCell,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";
import { PerBoardScoringPlugin, PerBoardView } from "@/scoring/plugins/types";
import { registerPerBoardPlugin } from "@/scoring/plugins/registry";

export type MpScoredLines = MatchpointLine[];

/** Rows with a real score, ordered as displayed (best NS matchpoints first). */
function displayRows(lines: MpScoredLines): MatchpointLine[] {
  return lines
    .filter((x) => x.score !== null)
    .sort((a, b) => b.nsMatchPoints - a.nsMatchPoints);
}

const matchpointsView: PerBoardView<MpScoredLines> = {
  id: "matchpoints",
  label: "MP",
  toTable(lines): ScoreTable {
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
          textCell(`${row.nsId}`),
          textCell(`${row.ewId}`),
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
  toTable(lines): ScoreTable {
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
          textCell(`${row.nsId}`),
          textCell(`${row.ewId}`),
          contractCell(row.outcome),
          numberCell(row.score!),
          numberCell(toPercent(row.nsMatchPoints), 2),
          numberCell(toPercent(row.ewMatchPoints), 2),
        ],
      })),
    };
  },
};

export const mpPerBoardPlugin: PerBoardScoringPlugin<MpScoredLines> = {
  id: "MP",
  score: (traveller: Traveller) => scoreMP(traveller.board, traveller.lines),
  // Percentage first matches the previous default (Toggle started "on" = "%").
  views: [percentageView, matchpointsView],
};

registerPerBoardPlugin(mpPerBoardPlugin);
