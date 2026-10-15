import { scoreIMP, ImpLine } from "@/scoring/traveller/pair/imp";
import { Traveller } from "@/model/traveller";
import { formatPairLabel } from "@/model/participants";
import {
  ScoreTable,
  contractCell,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";
import { PerBoardScoringPlugin, PerBoardView } from "@/scoring/plugins/types";
import { registerPerBoardPlugin } from "@/scoring/plugins/registry";

export type ImpScoredLines = ImpLine[];

const impView: PerBoardView<ImpScoredLines> = {
  id: "imps",
  label: "IMP",
  toTable(lines, options): ScoreTable {
    const withSection = options?.includeSection ?? true;
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
          textCell(formatPairLabel(row.nsId, withSection)),
          textCell(formatPairLabel(row.ewId, withSection)),
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

registerPerBoardPlugin(impPerBoardPlugin);
