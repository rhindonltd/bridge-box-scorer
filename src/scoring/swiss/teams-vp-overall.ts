import { TeamSwissVpOverallScore } from "@/model/leaderboard";
import { rank } from "@/scoring/overall/rank";
import { calculateWbfVP } from "./wbf-vp";
import { NEUTRAL_VP, SwissVpBoardRow } from "./swiss-vp-overall";
import { groupTeamMatches, teamMatchBoardImps } from "./team-match";

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
 * boards entered so far. The match reconstruction (pairing the two home tables
 * via the EW-seat-encodes-opponent convention) is shared with the USEBIO
 * exporter via `groupTeamMatches` / `teamMatchBoardImps`.
 */
export function calculateTeamsVpOverall(
  boardRows: SwissVpBoardRow[],
): TeamSwissVpOverallScore {
  const totals = new Map<string, Accumulator>();

  for (const match of groupTeamMatches(boardRows)) {
    const { round, homeTeamId, opponentTeamId } = match;
    const { margin, boardsPlayed } = teamMatchBoardImps(match);

    if (boardsPlayed === 0) {
      // Match drawn but nothing comparable yet: both teams sit at the average.
      credit(totals, homeTeamId, round, NEUTRAL_VP);
      credit(totals, opponentTeamId, round, NEUTRAL_VP);
      continue;
    }

    const { winnerVP, loserVP } = calculateWbfVP(boardsPlayed, margin);
    // A non-negative margin means the home team won (zero is a tie: both get 10).
    if (margin >= 0) {
      credit(totals, homeTeamId, round, winnerVP);
      credit(totals, opponentTeamId, round, loserVP);
    } else {
      credit(totals, opponentTeamId, round, winnerVP);
      credit(totals, homeTeamId, round, loserVP);
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
