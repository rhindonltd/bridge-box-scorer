import { TeamSwissVpOverallScore } from "@/model/leaderboard";
import { BoardOutcome } from "@/model/score";
import { parseSeat } from "@/model/participants";
import { outcomeToScore, computeImps } from "@/scoring/traveller/common";
import { rank } from "@/scoring/overall/rank";
import { calculateWbfVP } from "./wbf-vp";
import { NEUTRAL_VP, SwissVpBoardRow } from "./swiss-vp-overall";

/**
 * The final result on a board: a director override wins over the confirmed.
 */
function boardResult(row: SwissVpBoardRow): BoardOutcome | null {
  return row.directorOverrideResult ?? row.confirmedResult;
}

/**
 * A team's stable id is its home NS seat (e.g. "A1NS") — the same id
 * `findTeams` assigns and the leaderboard highlights on. Build it from the
 * section and the home table number.
 */
function teamId(section: string, homeTable: number): string {
  return `${section}${homeTable}NS`;
}

interface Accumulator {
  totalVP: number;
  vpByRound: Record<number, number>;
}

function credit(
  totals: Map<string, Accumulator>,
  id: string,
  round: number,
  vp: number,
): void {
  const acc = totals.get(id) ?? { totalVP: 0, vpByRound: {} };
  acc.vpByRound[round] = vp;
  acc.totalVP = Math.round((acc.totalVP + vp) * 100) / 100;
  totals.set(id, acc);
}

/** A single table's board row within a round, keyed for match assembly. */
interface TableBoard {
  score: number | null;
  boardNumber: number;
}

/**
 * Compute the Swiss Teams Victory-Point overall standings from a game's board
 * rows.
 *
 * A team match is played across two home tables (open + closed room) sharing
 * the same boards: at team A's home table its home pair is NS and team B's away
 * pair is EW; at team B's home table the mirror. Each team's raw result on a
 * board is its NS score at its own table minus the opponent's NS score at the
 * other table (its away pair sat EW there); the net converts to IMPs and the
 * match's summed IMP margin converts to Victory Points on the WBF 20-VP scale.
 * A team's session result is the sum of its per-round VPs, ranked highest-first.
 *
 * Like the pairs variant this shows a running estimate: a round with no results
 * yet shows the neutral 10 VP for both teams, and partial rounds score on the
 * boards entered so far. The two home tables of a match are recovered from the
 * seating — a table's EW seat id encodes the opponent's home table.
 */
export function calculateSwissTeamsVpOverall(
  boardRows: SwissVpBoardRow[],
): TeamSwissVpOverallScore {
  // Index every home-table's boards by (section, round, homeTable). Each row's
  // NS seat is that table's home team; its EW seat encodes the opponent home
  // table, which is how the two tables of a match are paired below.
  type HomeKey = string; // section|round|homeTable
  const homeBoards = new Map<
    HomeKey,
    { section: string; round: number; homeTable: number; opponentTable: number; boards: TableBoard[] }
  >();

  for (const row of boardRows) {
    if (row.status === "SIT_OUT") continue;

    const nsSeat = parseSeat(row.ns as Parameters<typeof parseSeat>[0]);
    const ewSeat = parseSeat(row.ew as Parameters<typeof parseSeat>[0]);
    const homeTable = nsSeat.tableNumber;
    const opponentTable = ewSeat.tableNumber;

    const key = `${row.section}|${row.roundNumber}|${homeTable}`;
    const entry =
      homeBoards.get(key) ??
      {
        section: row.section,
        round: row.roundNumber,
        homeTable,
        opponentTable,
        boards: [] as TableBoard[],
      };
    const outcome = boardResult(row);
    entry.boards.push({
      score: outcome != null ? outcomeToScore(row.boardNumber, outcome) : null,
      boardNumber: row.boardNumber,
    });
    homeBoards.set(key, entry);
  }

  const totals = new Map<string, Accumulator>();

  // Assemble matches: pair each home table with its opponent's home table,
  // processing each unordered match once (when homeTable < opponentTable).
  const processed = new Set<HomeKey>();

  for (const entry of homeBoards.values()) {
    const { section, round, homeTable, opponentTable } = entry;
    if (homeTable >= opponentTable) continue; // process the lower home once

    const matchKey = `${section}|${round}|${homeTable}`;
    if (processed.has(matchKey)) continue;
    processed.add(matchKey);

    const otherKey = `${section}|${round}|${opponentTable}`;
    const other = homeBoards.get(otherKey);

    const teamA = teamId(section, homeTable);
    const teamB = teamId(section, opponentTable);

    // Pair the two tables' boards by board number. Sum team A's net raw score
    // (A's NS score at its table minus B's NS score at B's table) over the
    // boards where BOTH tables have a result, and IMP the per-board net.
    const scoreByBoardA = new Map<number, number | null>();
    for (const b of entry.boards) scoreByBoardA.set(b.boardNumber, b.score);
    const scoreByBoardB = new Map<number, number | null>();
    for (const b of other?.boards ?? []) scoreByBoardB.set(b.boardNumber, b.score);

    let margin = 0; // net IMPs from team A's perspective
    let boardsPlayed = 0;
    for (const [boardNumber, scoreA] of scoreByBoardA) {
      const scoreB = scoreByBoardB.get(boardNumber);
      // Both tables must have a scored result for the board to count. A "PO"/
      // "NP" outcome maps to score null and is treated as not yet comparable.
      if (scoreA == null || scoreB == null || scoreB === undefined) continue;
      margin += computeImps(scoreA - scoreB);
      boardsPlayed += 1;
    }

    if (boardsPlayed === 0) {
      // Match drawn but nothing comparable yet: both teams sit at the average.
      credit(totals, teamA, round, NEUTRAL_VP);
      credit(totals, teamB, round, NEUTRAL_VP);
      continue;
    }

    const { winnerVP, loserVP } = calculateWbfVP(boardsPlayed, margin);
    // A non-negative margin means team A won (zero is a tie: both get 10).
    if (margin >= 0) {
      credit(totals, teamA, round, winnerVP);
      credit(totals, teamB, round, loserVP);
    } else {
      credit(totals, teamB, round, winnerVP);
      credit(totals, teamA, round, loserVP);
    }
  }

  const lines = rank(
    Array.from(totals.entries()).map(([id, acc]) => ({
      teamId: id,
      totalVP: acc.totalVP,
      vpByRound: acc.vpByRound,
    })),
    (row) => row.totalVP,
  );

  return {
    type: "TEAM_SWISS_VP",
    mode: "TEAM",
    scoring: "SWISS_VP",
    lines,
  };
}
