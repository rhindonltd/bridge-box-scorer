import {
  ScoreTable,
  contractCell,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";
import { BoardOutcome } from "@/model/score";
import { parseSeat } from "@/model/participants";
import { outcomeToScore, computeImps } from "@/scoring/traveller/common";
import { groupTeamMatches, TeamMatchRow } from "./team-match";

/**
 * The minimal per-board line a Team Result table is built from: one table's
 * seats and its result. This is the structural subset of `BoardInstance` (and
 * of the server `Board` row) the builder needs, so the play screen can pass its
 * pooled traveller instances straight in.
 */
export interface TeamBoardResultLine {
  tableNumber: number;
  ns: string;
  ew: string;
  /** The final result on the board at this table, or null when not entered. */
  result: BoardOutcome | null;
  status?: string | null;
}

/** Adapt a per-board line to the structural `TeamMatchRow` the grouper needs. */
function toMatchRow(
  boardNumber: number,
  line: TeamBoardResultLine,
): TeamMatchRow {
  return {
    section: parseSeat(line.ns).section,
    roundNumber: 0,
    boardNumber,
    ns: line.ns,
    ew: line.ew,
    confirmedResult: line.result,
    directorOverrideResult: null,
    status: line.status ?? null,
  };
}

/** A contract-or-dash cell: the contract when played, otherwise an em dash. */
function resultCell(result: BoardOutcome | null) {
  return result != null ? contractCell(result) : textCell("—");
}

/**
 * Build the "Team Result" table for one board, from the viewing player's team's
 * perspective.
 *
 * A team match spans two rooms sharing the same boards: the player's pair sits
 * at their own table, and their teammates sit at the opponent's table (as the
 * away pair). This table shows the two rooms' results on the board side by
 * side and the net IMPs the team gained or lost:
 *
 *   Room        Contract   Score
 *   Your table  4♠=        +620
 *   Teammates   4♠-1       -50    → +11 IMP to your team
 *
 * `instances` is the board's pooled lines (every table's row for this board, as
 * the traveller already holds). `viewingSeat` is the player's section-qualified
 * seat. Returns null when the viewing seat's table has no line for the board
 * (nothing to compare from the player's side yet). When the opponent room has
 * not entered its result, the teammates' row shows a dash and the IMP figure is
 * omitted (shown as "—").
 */
export function buildTeamBoardResultTable(
  instances: TeamBoardResultLine[],
  boardNumber: number,
  viewingSeat: string,
): ScoreTable | null {
  const myTable = parseSeat(viewingSeat).tableNumber;

  const matches = groupTeamMatches(
    instances.map((line) => toMatchRow(boardNumber, line)),
  );

  // Find the match this table is part of, and orient it so the "home" side is
  // the viewing player's table (groupTeamMatches keys the primary side on the
  // lower table number, which may be the opponent).
  const match = matches.find(
    (m) => m.homeTable === myTable || m.opponentTable === myTable,
  );
  if (!match) return null;

  const iAmHome = match.homeTable === myTable;
  const myRow = (iAmHome ? match.homeRowsByBoard : match.opponentRowsByBoard).get(
    boardNumber,
  );
  if (!myRow) return null;

  const otherRow = (
    iAmHome ? match.opponentRowsByBoard : match.homeRowsByBoard
  ).get(boardNumber);

  const myResult = myRow.confirmedResult;
  const otherResult = otherRow?.confirmedResult ?? null;

  const myScore = myResult != null ? outcomeToScore(boardNumber, myResult) : null;
  const otherScore =
    otherResult != null ? outcomeToScore(boardNumber, otherResult) : null;

  // Net IMPs to the team on this board (the "Team result" row): both rows are
  // stored from each table's NS perspective, and a team match pairs the two
  // rooms so the team's swing is its own table's NS score minus the other
  // room's NS score (the score conceded there). The two raw scores are netted
  // and converted to IMPs ONCE — the standard duplicate-teams comparison, which
  // is exactly what the leaderboard/USEBIO use, so this board detail reconciles
  // with the standings. (Per-score IMP values are deliberately NOT shown: IMP
  // conversion is non-linear, so they would not sum to this swing.)
  // `computeImps` is sign-symmetric, so this holds whether the viewing table is
  // the match's home or opponent side. Omitted until BOTH rooms have entered a
  // comparable result.
  const netImps =
    myScore != null && otherScore != null
      ? computeImps(myScore - otherScore)
      : null;

  return {
    columns: [{ label: "Table" }, { label: "Contract" }, { label: "Score" }],
    rows: [
      {
        highlightIds: [myRow.ns, myRow.ew],
        cells: [
          textCell("Home"),
          resultCell(myResult),
          myScore != null ? numberCell(myScore) : textCell("—"),
        ],
      },
      {
        highlightIds: otherRow ? [otherRow.ns, otherRow.ew] : [],
        cells: [
          textCell("Away"),
          resultCell(otherResult),
          otherScore != null ? numberCell(otherScore) : textCell("—"),
        ],
      },
      {
        // The single team swing for the board, spanning the score column so it
        // reads as a total rather than another per-room figure.
        highlightIds: [],
        cells: [
          textCell("Team result"),
          textCell(""),
          netImps != null ? textCell(`${formatImps(netImps)} IMP`) : textCell("—"),
        ],
      },
    ],
  };
}

/** Format a signed IMP total with an explicit leading + for a gain. */
function formatImps(imps: number): string {
  return imps > 0 ? `+${imps}` : `${imps}`;
}
