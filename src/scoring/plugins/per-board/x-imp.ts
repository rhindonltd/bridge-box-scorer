import { scoreXIMP } from "@/scoring/traveller/pair/x-imp";
import { Traveller } from "@/model/traveller";
import {
  ScoreTable,
  contractCell,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";
import { PerBoardScoringPlugin, PerBoardView } from "@/scoring/plugins/types";
import { registerPerBoardPlugin } from "@/scoring/plugins/registry";

export type XimpScoredLines = ReturnType<typeof scoreXIMP>;

const crossImpsView: PerBoardView<XimpScoredLines> = {
  id: "cross-imps",
  label: "X-IMP",
  toTable(lines): ScoreTable {
    const rows = lines
      .filter((x) => x.score !== null)
      .sort((a, b) => b.nsCrossImps - a.nsCrossImps);

    return {
      columns: [
        { label: "NS" },
        { label: "EW" },
        { label: "Contract" },
        { label: "NS Score" },
        { label: "NS IMP" },
        { label: "EW IMP" },
      ],
      rows: rows.map((row) => ({
        highlightIds: [row.nsId, row.ewId],
        cells: [
          textCell(`${row.nsId}`),
          textCell(`${row.ewId}`),
          contractCell(row.outcome),
          numberCell(row.score!),
          numberCell(row.nsCrossImps, 2),
          numberCell(row.ewCrossImps, 2),
        ],
      })),
    };
  },
};

export const ximpPerBoardPlugin: PerBoardScoringPlugin<XimpScoredLines> = {
  id: "XIMP",
  score: (traveller: Traveller) => scoreXIMP(traveller.board, traveller.lines),
  views: [crossImpsView],
};

registerPerBoardPlugin(ximpPerBoardPlugin);
