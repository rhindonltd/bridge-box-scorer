import type { ImpLine } from "@/modules/scoring";
import {
  ScoreTable,
  contractCell,
  numberCell,
  textCell,
} from "@/modules/results-views/table/score-table";
import type { PerBoardView } from "@/modules/results-views/view-types";
import { pairLabel } from "@/model/pair-label";

type ImpScoredLines = ImpLine[];

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

/** The traveller views for this scoring, the default first. */
export const impTravellerViews: PerBoardView<ImpScoredLines>[] = [impView];
