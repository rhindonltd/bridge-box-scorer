import { scoreMP, MatchpointLine } from "@/scoring/traveller/pair/mp";
import { roundMpBoards } from "@/scoring/traveller/pair/round-mp-boards";
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

/** Rows with a real score, ordered by NS score descending. */
function displayRows(lines: MpScoredLines): MatchpointLine[] {
  return lines
    .filter((x) => x.score !== null)
    .sort((a, b) => b.score! - a.score!);
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
  // EBU White Book §4.2.6.1: a single board's matchpoint score is rounded to
  // the nearest whole matchpoint (exact halves away from the board average).
  // Done on the per-board display so the shown MP / % match the figures the
  // overall ranking sums (which rounds the same way). Cross-board equalisation
  // and the "better than average" uplift are standings-only and deliberately
  // NOT applied here — this is a single board in isolation.
  score: (traveller: Traveller) =>
    roundMpBoards([
      { board: traveller.board, lines: scoreMP(traveller.board, traveller.lines) },
    ])[0].lines,
  // Percentage first matches the previous default (Toggle started "on" = "%").
  views: [percentageView, matchpointsView],
};

registerPerBoardPlugin(mpPerBoardPlugin);
