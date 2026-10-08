import { TeamSwissVpOverallScore } from "@/model/leaderboard";
import { rank } from "@/scoring/overall/rank";
import { impVpWinner } from "./imp-vp-table";
import { NEUTRAL_VP, SwissVpBoardRow } from "./swiss-vp-overall";
import { VpAccumulator, creditVp } from "./vp-accumulator";
import {
  groupTeamMatches,
  groupTeamTriples,
  matchMismatch,
  matchVoidCause,
  teamByeRounds,
  teamMatchBoardImps,
  tripleTeamStakes,
  tripleVpPool,
  type TeamMatchStructureRow,
} from "./team-match";
import { voidMatchVp } from "@/model/teams-match-void";
import { adjustMismatchVp } from "@/model/swiss-mismatch";

/**
 * Victory Points awarded to a team that sits out a round (an odd-field bye).
 * An average-plus award (2 above the neutral 10) mirrors the sit-out
 * convention: a forced bye should not disadvantage — and slightly favours — the
 * sitting team, without matching a strong win.
 */
const BYE_VP = 12;

/**
 * Compute the Swiss Teams Victory-Point overall standings from a game's board
 * rows.
 *
 * A team match is played across two home tables (open + closed room) sharing
 * the same boards: at team A's home table its home pair is NS and team B's away
 * pair is EW; at team B's home table the mirror. Each team's raw result on a
 * board is its NS score at its own table minus the opponent's NS score at the
 * other table (its away pair sat EW there); the net converts to IMPs and the
 * match's summed IMP margin converts to Victory Points on the EBU 20-VP discrete
 * (integer) scale. A team's session result is the sum of its per-round VPs,
 * ranked highest-first.
 *
 * Like the pairs variant this shows a running estimate: a round with no results
 * yet shows the neutral 10 VP for both teams, and partial rounds score on the
 * boards entered so far. The match reconstruction (pairing the two home tables
 * via the EW-seat-encodes-opponent convention) is shared with the USEBIO
 * exporter via `groupTeamMatches` / `teamMatchBoardImps`.
 */
export function calculateTeamsVpOverall(
  boardRows: SwissVpBoardRow[],
  matchRows: TeamMatchStructureRow[],
  options: { expectedBoards?: number } = {},
): TeamSwissVpOverallScore {
  const totals = new Map<string, VpAccumulator>();
  const { expectedBoards } = options;

  for (const match of groupTeamMatches(boardRows, matchRows)) {
    const { round, homeTeamId, opponentTeamId } = match;

    // §3.3.6 / §3.3.9 void match: credit each team a ruling VP (flat 40%/60%,
    // or the §3.3.9 AVE+/AVE− half-board split) instead of a margin → VP. This
    // also distinguishes "both at fault" from "neither at fault" (per-side
    // absolute VP), which a single zero-sum margin cannot.
    const voidCause = matchVoidCause(match);
    if (voidCause != null) {
      const { home, opponent } = voidMatchVp(voidCause, 20, expectedBoards);
      creditVp(totals, homeTeamId, round, home);
      creditVp(totals, opponentTeamId, round, opponent);
      continue;
    }

    const { margin, boardsPlayed } = teamMatchBoardImps(match);

    if (boardsPlayed === 0) {
      // Match drawn but nothing comparable yet: both teams sit at the average.
      creditVp(totals, homeTeamId, round, NEUTRAL_VP);
      creditVp(totals, opponentTeamId, round, NEUTRAL_VP);
      continue;
    }

    // The match's IMP margin → VP on the EBU 20-VP discrete scale; the loser
    // takes the mirror (20 − winner). A non-negative margin means the home team
    // won (zero is a tie: both get 10).
    const winnerVP = impVpWinner(Math.abs(margin), boardsPlayed, 20);
    const loserVP = 20 - winnerVP;
    let homeVp = margin >= 0 ? winnerVP : loserVP;
    let opponentVp = margin >= 0 ? loserVP : winnerVP;

    // §3.5 mismatch: the match was played and scored normally, but the director
    // has ruled one side mismatched; recompute ONLY that side's round VP via
    // the §3.5.2 one-sided adjustment (home-relative: NS = home, EW = opponent).
    const mismatch = matchMismatch(match);
    if (mismatch != null) {
      if (mismatch.side === "NS") {
        homeVp = adjustMismatchVp(homeVp, mismatch, 20);
      } else {
        opponentVp = adjustMismatchVp(opponentVp, mismatch, 20);
      }
    }

    creditVp(totals, homeTeamId, round, homeVp);
    creditVp(totals, opponentTeamId, round, opponentVp);
  }

  // Credit each bye team an average-plus result for the round it sat out.
  for (const bye of teamByeRounds(matchRows)) {
    creditVp(totals, bye.teamId, bye.round, BYE_VP);
  }

  // Credit each triple team its head-to-head comparison VPs. A triple is three
  // ordinary two-team comparisons (x-y, y-z, z-x); each team plays two of them.
  // Each comparison's IMP margin converts to VP on the 10-VP half pool (SHORT)
  // or 20-VP full pool (LONG); the loser takes the mirror. A team's two
  // comparisons are summed into the round(s) its NS pair hosted them in (SHORT:
  // one round; LONG: split across R and R+1). A comparison with nothing
  // comparable yet sits at the neutral 10 — so a long triple reads 10/10 across
  // both rounds until its second round is scored (both rooms of a comparison
  // are needed for a margin), without lurching the standings.
  for (const triple of groupTeamTriples(boardRows, matchRows)) {
    const pool = tripleVpPool(triple);
    // Aggregate each (team, round) VP across the team's comparisons, then
    // credit once (creditVp assigns the round value, so it must be pre-summed).
    const byTeamRound = new Map<string, number>();
    for (const stake of tripleTeamStakes(triple)) {
      const { margin, boardsPlayed } = teamMatchBoardImps(stake.comparison);
      let vp: number;
      if (boardsPlayed === 0) {
        // Nothing comparable yet: the dead-even midpoint of this pool (5 on the
        // 10-VP half pool, 10 on the 20-VP full pool). A SHORT team's two
        // 5-neutral halves sum to the round's neutral 10; a LONG team's single
        // per-round comparison is a neutral 10.
        vp = pool / 2;
      } else {
        const winnerVP = impVpWinner(Math.abs(margin), boardsPlayed, pool);
        const loserVP = pool - winnerVP;
        // A non-negative margin favours the home side; the away side mirrors.
        const homeWon = margin >= 0;
        vp = stake.isHome === homeWon ? winnerVP : loserVP;
      }
      const key = `${stake.teamId}|${stake.round}`;
      byTeamRound.set(key, (byTeamRound.get(key) ?? 0) + vp);
    }
    for (const [key, vp] of byTeamRound) {
      const [teamId, roundStr] = key.split("|");
      creditVp(totals, teamId, Number(roundStr), vp);
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
