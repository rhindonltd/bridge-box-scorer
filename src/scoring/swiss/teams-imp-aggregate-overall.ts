import { rank } from "@/scoring/overall/rank";
import { SwissVpBoardRow } from "./swiss-vp-overall";
import {
  groupTeamMatches,
  groupTeamTriples,
  teamByeRounds,
  teamMatchBoardImps,
  tripleTeamStakes,
} from "./team-match";
import type { TeamImpAggOverallScore } from "@/model/leaderboard";

/**
 * Per-team accumulation for aggregate-IMP scoring: the running net-IMP session
 * total and the per-round breakdown, keyed by team id.
 */
interface ImpAccumulator {
  totalImps: number;
  impsByRound: Record<number, number>;
}

/**
 * Credit a team its net IMPs for a round.
 *
 * A team plays at most one match (or one triple) per round, so the round
 * value is an assignment, while the session total sums across rounds. IMPs are
 * whole numbers, so no rounding is needed.
 */
function creditImps(
  totals: Map<string, ImpAccumulator>,
  id: string,
  round: number,
  imps: number,
): void {
  const acc = totals.get(id) ?? { totalImps: 0, impsByRound: {} };
  acc.impsByRound[round] = imps;
  acc.totalImps += imps;
  totals.set(id, acc);
}

/**
 * Compute the aggregate-IMP teams overall standings from a game's board rows.
 *
 * This is the raw-IMP sibling of {@link import("./teams-vp-overall").calculateTeamsVpOverall}:
 * the match reconstruction is identical, but a team's round result is its net
 * IMP margin itself (no conversion to Victory Points), and its session result
 * is the sum of those per-round margins. Teams rank highest-total-first, and a
 * total can be negative (a team that has lost more IMPs than it has won).
 *
 * A team match spans two home tables sharing the same boards; the home team's
 * net IMPs on the round are `+margin` and the opponent's are `−margin` (each
 * board's IMP difference, summed). A three-way triple credits each team its
 * cross-IMP total for the round. A bye contributes 0 IMPs — a forced sit-out
 * neither helps nor hurts the aggregate total — but is still recorded for the
 * round so the team stays on the table.
 *
 * Like the VP variant this shows a running estimate: only boards with a
 * comparable scored result in both rooms count, so a round grows as results
 * come in. `barometer` is carried straight onto the result so the leaderboard
 * view knows whether to render a per-round table (Swiss Teams) or a single
 * cumulative total (Round Robin Teams); it does not affect the maths.
 */
export function calculateTeamsImpAggregateOverall(
  boardRows: SwissVpBoardRow[],
  options: { barometer: boolean },
): TeamImpAggOverallScore {
  const totals = new Map<string, ImpAccumulator>();

  for (const match of groupTeamMatches(boardRows)) {
    const { round, homeTeamId, opponentTeamId } = match;
    const { margin } = teamMatchBoardImps(match);

    // The home team's net IMPs are the margin; the opponent's are its negation.
    // A round with nothing comparable yet has margin 0, crediting both teams 0
    // so they appear on the table without moving.
    creditImps(totals, homeTeamId, round, margin);
    creditImps(totals, opponentTeamId, round, -margin);
  }

  // A bye contributes no IMPs, but record the round so the sitting team stays
  // on the table.
  for (const bye of teamByeRounds(boardRows)) {
    creditImps(totals, bye.teamId, bye.round, 0);
  }

  // Each triple team is credited its net IMPs from each of its two head-to-head
  // comparisons (the home side gets +margin, the away side −margin), summed into
  // the round(s) its NS pair hosted them in (SHORT: one round; LONG: split
  // across R and R+1). Nothing comparable yet contributes 0, exactly like a
  // two-team match.
  for (const triple of groupTeamTriples(boardRows)) {
    const byTeamRound = new Map<string, number>();
    for (const stake of tripleTeamStakes(triple)) {
      const { margin } = teamMatchBoardImps(stake.comparison);
      const imps = stake.isHome ? margin : -margin;
      const key = `${stake.teamId}|${stake.round}`;
      byTeamRound.set(key, (byTeamRound.get(key) ?? 0) + imps);
    }
    for (const [key, imps] of byTeamRound) {
      const [teamId, roundStr] = key.split("|");
      creditImps(totals, teamId, Number(roundStr), imps);
    }
  }

  const lines = rank(
    Array.from(totals.entries()).map(([id, acc]) => ({
      teamId: id,
      totalImps: acc.totalImps,
      impsByRound: acc.impsByRound,
    })),
    (row) => row.totalImps,
  );

  return {
    type: "TEAM_IMP_AGG",
    mode: "TEAM",
    scoring: "IMP_AGG",
    barometer: options.barometer,
    lines,
  };
}
