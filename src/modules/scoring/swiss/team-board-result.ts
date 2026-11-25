import { BoardOutcome } from "@/model/score";
import { parseSeat } from "@/model/participants";
import { computeImps } from "@/modules/scoring/traveller/common";
import {
  groupTeamMatches,
  scoreOfRow,
  teamIdFor,
  TeamMatchRow,
  type TeamMatchStructureRow,
} from "./team-match";

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
  /**
   * The director marked this table "played the wrong way round". A traveller
   * instance then arrives with `ns` / `ew` already exchanged (the teams
   * credited with the result).
   */
  seatsSwapped?: boolean | null;
}

/**
 * Adapt a per-board line to the structural `TeamMatchRow` the grouper needs.
 *
 * Teams rows are filed by the table encoded in `ns`, so a swapped line has its
 * ids put back in the recorded orientation here and carries `seatsSwapped`;
 * `scoreOfRow` then credits the room's score from the opposite perspective.
 */
function toMatchRow(
  boardNumber: number,
  line: TeamBoardResultLine,
): TeamMatchRow {
  const [ns, ew] = line.seatsSwapped ? [line.ew, line.ns] : [line.ns, line.ew];
  return {
    section: parseSeat(ns).section,
    roundNumber: 0,
    boardNumber,
    ns,
    ew,
    seatsSwapped: line.seatsSwapped ?? false,
    confirmedResult: line.result,
    directorOverrideResult: null,
    status: line.status ?? null,
  };
}

/** One room's line in a team board result. */
export interface TeamBoardRoomResult {
  /** The room's seats, as the traveller holds them (for row highlighting). */
  ns: string;
  ew: string;
  /** The final result in this room, or null when not entered. */
  result: BoardOutcome | null;
  /** The room's score for the team at NS there, or null when not scored. */
  score: number | null;
}

/** One board's team result: the viewing team's two rooms and its net IMPs. */
export interface TeamBoardResult {
  /** The viewing player's own table. */
  home: TeamBoardRoomResult;
  /** The teammates' table, or null when it has no line for the board. */
  away: TeamBoardRoomResult | null;
  /** Net IMPs to the team on the board, or null until both rooms have scored. */
  netImps: number | null;
}

/**
 * The team result for one board, from the viewing player's team's
 * perspective. Results-views lays it out as the "Team Result" table
 * (`teamBoardResultTable`).
 *
 * A team match spans two rooms sharing the same boards: the player's pair sits
 * at their own table, and their teammates sit at the opponent's table (as the
 * away pair). The result gives the two rooms' results and scores on the board
 * and the net IMPs the team gained or lost:
 *
 *   Room        Contract   Score
 *   Your table  4♠=        +620
 *   Teammates   4♠-1       -50    → +11 IMP to your team
 *
 * `instances` is the board's pooled lines (every table's row for this board, as
 * the traveller already holds). `viewingSeat` is the player's section-qualified
 * seat. Returns null when the viewing seat's table has no line for the board
 * (nothing to compare from the player's side yet). When the opponent room has
 * not entered its result, its result and score are null and so is `netImps`.
 */
export function teamBoardResult(
  instances: TeamBoardResultLine[],
  boardNumber: number,
  viewingSeat: string,
): TeamBoardResult | null {
  const myTable = parseSeat(viewingSeat).tableNumber;

  // This client-side view holds only the board's flat per-table lines (no
  // `matches` rows), so synthesise the one TEAMS encounter they form: each
  // line's NS seat is a room's home team; the two tables are paired on the
  // lower table number (the match's canonical home side).
  const rows = instances.map((line) => toMatchRow(boardNumber, line));
  const matchStructure: TeamMatchStructureRow[] = [];
  const seenMatch = new Set<string>();
  for (const row of rows) {
    if (row.status === "SIT_OUT" || row.status === "HALF_AVERAGE") continue;
    let homeTable: number;
    let oppTable: number;
    try {
      homeTable = parseSeat(row.ns).tableNumber;
      oppTable = parseSeat(row.ew).tableNumber;
    } catch {
      continue;
    }
    const lo = Math.min(homeTable, oppTable);
    const hi = Math.max(homeTable, oppTable);
    const key = `${row.section}|${lo}-${hi}`;
    if (seenMatch.has(key)) continue;
    seenMatch.add(key);
    matchStructure.push({
      section: row.section,
      roundNumber: row.roundNumber,
      kind: "TEAMS",
      home: teamIdFor(row.section, lo),
      opponent: teamIdFor(row.section, hi),
      groupId: null,
      vpPool: 20,
      boardStart: boardNumber,
      boardEnd: boardNumber,
    });
  }

  const matches = groupTeamMatches(rows, matchStructure);

  // Find the match this table is part of, and orient it so the "home" side is
  // the viewing player's table (groupTeamMatches keys the primary side on the
  // lower table number, which may be the opponent).
  const match = matches.find(
    (m) => m.homeTable === myTable || m.opponentTable === myTable,
  );
  if (!match) return null;

  const iAmHome = match.homeTable === myTable;
  const myRow = (
    iAmHome ? match.homeRowsByBoard : match.opponentRowsByBoard
  ).get(boardNumber);
  if (!myRow) return null;

  const otherRow = (
    iAmHome ? match.opponentRowsByBoard : match.homeRowsByBoard
  ).get(boardNumber);

  const myResult = myRow.confirmedResult;
  const otherResult = otherRow?.confirmedResult ?? null;

  // Each room's score from the perspective of the team recorded at NS there
  // (negated for a room the director marked played-reversed).
  const myScore = scoreOfRow(myRow);
  const otherScore = scoreOfRow(otherRow);

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
    home: {
      ns: myRow.ns,
      ew: myRow.ew,
      result: myResult,
      score: myScore,
    },
    away: otherRow
      ? {
          ns: otherRow.ns,
          ew: otherRow.ew,
          result: otherResult,
          score: otherScore,
        }
      : null,
    netImps,
  };
}
