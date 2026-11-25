import { scoreIMP, ImpLine } from "@/modules/scoring/traveller/pair/imp";
import { Traveller } from "@/model/traveller";
import {
  ScoreTable,
  contractCell,
  numberCell,
  textCell,
} from "@/modules/scoring/table/score-table";
import {
  PerBoardScoringPlugin,
  PerBoardView,
} from "@/modules/scoring/plugins/types";
import { pairLabel } from "@/model/pair-label";

export type ImpScoredLines = ImpLine[];

const impView: PerBoardView<ImpScoredLines> = {
  id: "imps",
  label: "IMP",
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
          numberCell(row.nsImps),
          numberCell(row.ewImps),
        ],
      })),
    };
  },
};

export const impPerBoardPlugin: PerBoardScoringPlugin<ImpScoredLines> = {
  id: "IMP",
  score: (traveller: Traveller) => scoreIMP(traveller.board, traveller.lines),
  views: [impView],
};
