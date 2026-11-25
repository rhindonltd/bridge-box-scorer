import type { TeamBoardResult } from "@/modules/scoring";
import type { BoardOutcome } from "@/model/score";
import {
  ScoreTable,
  contractCell,
  numberCell,
  textCell,
} from "@/modules/results-views/table/score-table";

/** A contract-or-dash cell: the contract when played, otherwise an em dash. */
function resultCell(result: BoardOutcome | null) {
  return result != null ? contractCell(result) : textCell("—");
}

/** A score-or-dash cell. */
function scoreCell(score: number | null) {
  return score != null ? numberCell(score) : textCell("—");
}

/** Format a signed IMP total with an explicit leading + for a gain. */
function formatImps(imps: number): string {
  return imps > 0 ? `+${imps}` : `${imps}`;
}

/**
 * The "Team Result" table for one board (from scoring's `teamBoardResult`):
 * the viewing team's two rooms side by side and the net IMPs it gained or lost.
 *
 *   Table        Contract   Score
 *   Home         4♠=        +620
 *   Away         4♠-1       -50
 *   Team result             +11 IMP
 *
 * A room with no result yet shows a dash, and so does the IMP figure until both
 * rooms have scored. Per-room IMPs are deliberately not shown: IMP conversion is
 * non-linear, so they would not sum to the team's swing.
 */
export function teamBoardResultTable(
  result: TeamBoardResult | null,
): ScoreTable | null {
  // No result means the viewing table has no line for the board yet.
  if (result == null) return null;
  const { home, away, netImps } = result;
  return {
    columns: [{ label: "Table" }, { label: "Contract" }, { label: "Score" }],
    rows: [
      {
        highlightIds: [home.ns, home.ew],
        cells: [
          textCell("Home"),
          resultCell(home.result),
          scoreCell(home.score),
        ],
      },
      {
        highlightIds: away ? [away.ns, away.ew] : [],
        cells: [
          textCell("Away"),
          resultCell(away?.result ?? null),
          scoreCell(away?.score ?? null),
        ],
      },
      {
        // The single team swing for the board, spanning the score column so it
        // reads as a total rather than another per-room figure.
        highlightIds: [],
        cells: [
          textCell("Team result"),
          textCell(""),
          netImps != null
            ? textCell(`${formatImps(netImps)} IMP`)
            : textCell("—"),
        ],
      },
    ],
  };
}
