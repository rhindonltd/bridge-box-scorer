import {
  ScoreTable,
  multilineCell,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";
import { PairSwissVpOverallScore } from "@/model/leaderboard";
import { AssignedPair } from "@/model/participants";
import { pairNameLines } from "@/scoring/plugins/overall/pair-names";
import { rankCell } from "@/scoring/plugins/overall/overall-view";

/**
 * Build the Swiss Pairs Victory-Point leaderboard table.
 *
 * Columns are Rank, Pair, Total, then one column per round (1..N). A pair's
 * cell for a round shows its VP for that round when the match is scored, and is
 * left blank otherwise. The number of round columns is the highest round any
 * pair has been scored in (0 rounds ⇒ no round columns yet).
 *
 * Rows carry the pair id in `highlightIds`, so the shared table view highlights
 * the viewing pair's row the same way every other leaderboard does.
 */
export function buildSwissVpTable(
  leaderboard: PairSwissVpOverallScore,
  participants: AssignedPair[],
): ScoreTable {
  const roundCount = leaderboard.lines.reduce((max, line) => {
    const rounds = Object.keys(line.vpByRound).map(Number);
    return rounds.length === 0 ? max : Math.max(max, ...rounds);
  }, 0);

  const roundNumbers = Array.from({ length: roundCount }, (_, i) => i + 1);

  return {
    columns: [
      { label: "Rank" },
      { label: "Pair" },
      { label: "Total" },
      ...roundNumbers.map((r) => ({ label: `${r}` })),
    ],
    rows: leaderboard.lines.map((row) => ({
      highlightIds: [row.pairId],
      cells: [
        rankCell(row),
        multilineCell(pairNameLines(participants, row.pairId)),
        numberCell(row.totalVP, 2),
        ...roundNumbers.map((r) => {
          const vp = row.vpByRound[r];
          return vp === undefined ? textCell("") : numberCell(vp, 2);
        }),
      ],
    })),
  };
}
