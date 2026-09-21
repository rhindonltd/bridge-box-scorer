import {
  ScoreTable,
  multilineCell,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";
import { OverallView } from "@/scoring/plugins/types";
import { pairNameLines } from "./pair-names";

/** A leaderboard line that carries a rank and a tie flag. */
type RankedLine = { rank: number; tied: boolean; pairId: string };

/**
 * The Rank cell, shared across the overall views: an equals sign trails the
 * rank number for tied lines (e.g. "3=").
 */
export function rankCell(row: { rank: number; tied: boolean }) {
  return textCell(row.tied ? `${row.rank}=` : `${row.rank}`);
}

/**
 * The round-column numbers `1..N` for a per-round leaderboard, where `N` is the
 * highest round any line has been scored in (0 rounds ⇒ an empty list, i.e. no
 * round columns yet). Each line records its per-round values in a `Record`
 * keyed by round number (`vpByRound`, `byRound`, …); pass that field's map.
 */
export function roundColumnNumbers<TLine>(
  lines: TLine[],
  perRound: (line: TLine) => Record<number, unknown>,
): number[] {
  const roundCount = lines.reduce((max, line) => {
    const rounds = Object.keys(perRound(line)).map(Number);
    return rounds.length === 0 ? max : Math.max(max, ...rounds);
  }, 0);
  return Array.from({ length: roundCount }, (_, i) => i + 1);
}

/**
 * Build a simple "Rank / Pair / <score>" overall view for the IMP-family
 * plugins (IMP and Cross-IMP), which differ only in their id, label, column
 * heading, and which numeric field holds the score. Removes the near-identical
 * copies these two plugins used to carry.
 */
export function buildImpView<TLine extends RankedLine>(config: {
  id: string;
  label: string;
  value: (line: TLine) => number;
}): OverallView<{ lines: TLine[] }> {
  return {
    id: config.id,
    label: config.label,
    toTable(leaderboard, participants): ScoreTable {
      return {
        columns: [
          { label: "Rank" },
          { label: "Pair" },
          { label: config.label },
        ],
        rows: leaderboard.lines.map((row) => ({
          highlightIds: [row.pairId],
          cells: [
            rankCell(row),
            multilineCell(pairNameLines(participants, row.pairId)),
            numberCell(config.value(row)),
          ],
        })),
      };
    },
  };
}
