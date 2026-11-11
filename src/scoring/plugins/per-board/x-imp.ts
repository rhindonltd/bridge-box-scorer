import { scoreXIMP } from "@/scoring/traveller/pair/x-imp";
import { Traveller } from "@/model/traveller";
import {
  ScoreTable,
  contractCell,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";
import { PerBoardScoringPlugin, PerBoardView } from "@/scoring/plugins/types";
import { pairLabel } from "@/model/pair-label";
import { registerPerBoardPlugin } from "@/scoring/plugins/registry";

export type XimpScoredLines = ReturnType<typeof scoreXIMP>;

const crossImpsView: PerBoardView<XimpScoredLines> = {
  id: "cross-imps",
  label: "X-IMP",
  toTable(lines, options): ScoreTable {
    const hide = options?.hideSection ?? false;
    const rows = lines
      .filter((x) => x.score !== null)
      .sort((a, b) => b.score! - a.score!);

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
          textCell(pairLabel(row.nsId, hide)),
          textCell(pairLabel(row.ewId, hide)),
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
