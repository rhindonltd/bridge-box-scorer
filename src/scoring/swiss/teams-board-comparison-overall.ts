import {
  TeamBamOverallScore,
  TeamPabOverallScore,
} from "@/model/leaderboard";
import { rank } from "@/scoring/overall/rank";
import { SwissVpBoardRow } from "./swiss-vp-overall";
import {
  groupTeamMatches,
  teamByeRounds,
  teamMatchBoardWins,
} from "./team-match";

/**
 * The fraction of a round's boards a bye team is credited (average-plus, i.e.
 * 60% of the boards it would have played). Held in native board units, so it
 * scales the same on the BAM (1×) and PAB (2×) presentations.
 */
const BYE_WON_FRACTION = 0.6;

/**
 * The two board-comparison teams scorings. They are identical bar the per-board
 * points scale (applied at the display/export boundary) and the USEBIO tag:
 *   - BAM (Board-a-Match): 1 point per board won, 0.5 for a tie.
 *   - PAB (Point-a-Board): 2 points per board won, 1 for a tie.
 */
export type BoardComparisonScoring = "BAM" | "PAB";

interface Accumulator {
  totalWon: number;
  totalPlayed: number;
  byRound: Record<number, { won: number; played: number }>;
}

function credit(
  totals: Map<string, Accumulator>,
  id: string,
  round: number,
  won: number,
  played: number,
): void {
  const acc = totals.get(id) ?? { totalWon: 0, totalPlayed: 0, byRound: {} };
  const prev = acc.byRound[round] ?? { won: 0, played: 0 };
  acc.byRound[round] = { won: prev.won + won, played: prev.played + played };
  acc.totalWon = Math.round((acc.totalWon + won) * 100) / 100;
  acc.totalPlayed += played;
  totals.set(id, acc);
}

/**
 * Compute the board-comparison overall standings (Board-a-Match or
 * Point-a-Board) for a teams game from its board rows.
 *
 * Each board of a team match is its own mini-match, decided on raw contract
 * score: the team with the higher score wins the board, an equal score is a
 * tie, the lower score loses. Standings are held in NATIVE BOARD UNITS (win 1 /
 * tie 0.5 / loss 0) regardless of `scoring`; the per-board points scale (BAM 1,
 * PAB 2) is applied only when the standings are displayed or exported, so BAM
 * and PAB rank identically and differ only in presentation.
 *
 * `teamMatchBoardWins` reports the home (primary) team's per-board wins, so the
 * opponent's wins on the same boards are `boardsPlayed - homeWon` (ties split).
 * A round with nothing comparable yet credits 0 won / 0 played so it doesn't
 * distort the running standings.
 *
 * `barometer` is carried straight onto the result: it tells the leaderboard
 * view whether to render a per-round table (Swiss Teams) or a single cumulative
 * total (Round Robin Teams); it does not affect the scoring maths. `scoring`
 * is likewise carried through so the view/export apply the right scale and tag.
 */
export function calculateTeamsBoardComparisonOverall(
  boardRows: SwissVpBoardRow[],
  options: { barometer: boolean; scoring: BoardComparisonScoring },
): TeamBamOverallScore | TeamPabOverallScore {
  const totals = new Map<string, Accumulator>();

  for (const match of groupTeamMatches(boardRows)) {
    const { round, homeTeamId, opponentTeamId } = match;
    const { won, boardsPlayed } = teamMatchBoardWins(match);

    // Both teams are credited every round so the field is complete; a match
    // with nothing comparable yet contributes 0 won / 0 played to each.
    credit(totals, homeTeamId, round, won, boardsPlayed);
    credit(totals, opponentTeamId, round, boardsPlayed - won, boardsPlayed);
  }

  // Credit each bye team an average-plus result (60% of the round's boards) for
  // the round it sat out, so a forced bye slightly favours the sitting team.
  for (const bye of teamByeRounds(boardRows)) {
    credit(
      totals,
      bye.teamId,
      bye.round,
      BYE_WON_FRACTION * bye.boards,
      bye.boards,
    );
  }

  const lines = rank(
    Array.from(totals.entries()).map(([id, acc]) => ({
      teamId: id,
      totalWon: acc.totalWon,
      totalPlayed: acc.totalPlayed,
      byRound: acc.byRound,
    })),
    (row) => row.totalWon,
  );

  const type = options.scoring === "PAB" ? "TEAM_PAB" : "TEAM_BAM";
  return {
    type,
    mode: "TEAM",
    scoring: options.scoring,
    barometer: options.barometer,
    lines,
  } as TeamBamOverallScore | TeamPabOverallScore;
}

/**
 * Board-a-Match overall standings (1 point per board). Thin wrapper over
 * {@link calculateTeamsBoardComparisonOverall}.
 */
export function calculateTeamsBamOverall(
  boardRows: SwissVpBoardRow[],
  options: { barometer: boolean },
): TeamBamOverallScore {
  return calculateTeamsBoardComparisonOverall(boardRows, {
    ...options,
    scoring: "BAM",
  }) as TeamBamOverallScore;
}

/**
 * Point-a-Board overall standings (2 points per board). Thin wrapper over
 * {@link calculateTeamsBoardComparisonOverall}.
 */
export function calculateTeamsPabOverall(
  boardRows: SwissVpBoardRow[],
  options: { barometer: boolean },
): TeamPabOverallScore {
  return calculateTeamsBoardComparisonOverall(boardRows, {
    ...options,
    scoring: "PAB",
  }) as TeamPabOverallScore;
}
